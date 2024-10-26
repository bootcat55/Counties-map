import * as d3 from 'd3';
import { csv } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js'; // Import the bar chart update function
import { stateElectoralVotes } from './electoralVotes.js'; // Import state electoral votes

// Declare voteMap and voteData globally within statemap.js
let voteMap = new Map();
let voteData = [];

// Function to create the US states map
function createStateMap() {
    // Load the vote data from usacounty_votes.csv
    d3.csv('data/usacounty_votes.csv').then(voteDataLoaded => {
        voteData = voteDataLoaded.map(d => ({
            ...d,
            FIPS: +d.FIPS // Ensure FIPS is treated as a number
        }));

        // Aggregate votes by state
        const stateVotes = d3.rollups(
            voteData,
            v => ({
                totalRepublican: d3.sum(v, d => +d.Republican),
                totalDemocrat: d3.sum(v, d => +d.Democrat)
            }),
            d => d.State  // Group by state abbreviation
        );

        // Populate the global voteMap with state-level totals
        voteMap = new Map(stateVotes);

        // Set up the SVG container for the states map
        const svgContainer = d3.select("#state-map")
            .append("div")  // Create a div to hold the SVG
            .attr("class", "svg-container");

        // Load the external SVG file for US states
        d3.xml('data/us-states6.svg').then(data => {
            const importedNode = document.importNode(data.documentElement, true);
            svgContainer.node().appendChild(importedNode);

            // Add interaction and styling for all states
            d3.select(svgContainer.node())
                .selectAll("path")
                .style("fill", function () {
                    const stateId = this.getAttribute("id");
                    const votes = voteMap.get(stateId);

                    // Color red for Republican majority, blue for Democrat majority
                    return votes && votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
                })
                .attr("stroke", "#333")
                .attr("stroke-width", 1.5)
                .on("mouseover", function (event) {
                    const tooltip = d3.select("#state-tooltip")
                        .attr("class", "tooltip")
                        .style("display", "block");

                    const stateId = this.getAttribute("id");
                    const votes = voteMap.get(stateId);

                    // Calculate percentages
                    const totalVotes = votes.totalRepublican + votes.totalDemocrat;
                    const percentageRepublican = (votes.totalRepublican / totalVotes) * 100;
                    const percentageDemocrat = (votes.totalDemocrat / totalVotes) * 100;

                    tooltip.html(`
                                    <strong>State: ${stateId}</strong><br>
                                    <strong><span style="color: red;">Republican:</span></strong> ${percentageRepublican.toFixed(1)}%<br>
                                    <strong><span style="color: blue;">Democrat:</span></strong> ${percentageDemocrat.toFixed(1)}%<br>
                                    Republican: ${votes ? votes.totalRepublican : 'N/A'}<br>
                                    Democrat: ${votes ? votes.totalDemocrat : 'N/A'}
                                  `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");

                    d3.select(this).style("fill", "lightblue");  // Highlight on hover
                })
                .on("mousemove", function (event) {
                    d3.select("#state-tooltip")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function () {
                    d3.select("#state-tooltip").style("display", "none");

                    const stateId = this.getAttribute("id");
                    const votes = voteMap.get(stateId);

                    // Reset color based on vote data after hover
                    d3.select(this).style("fill", votes.totalRepublican > votes.totalDemocrat ? "red" : "blue");
                });
        });
    });
}

// Function to update the state color based on updated vote totals
function updateStateColor(stateAbbreviation, voteMap) {
    const svgContainer = d3.select("#state-map").select(".svg-container");
    svgContainer.selectAll("path")
        .filter(function () { return this.getAttribute("id") === stateAbbreviation; })
        .style("fill", function () {
            const votes = voteMap.get(stateAbbreviation);
            return votes && votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
        });

    // Emit event to update the stacked bar chart
    const event = new CustomEvent('stateVoteUpdated', { detail: { voteMap } });
    window.dispatchEvent(event);
}

// Listen for county vote updates and recalculate state totals
window.addEventListener('countyVoteUpdated', function(e) {
    const { state, republicanVotes, democratVotes, fips } = e.detail;

    // Find and update the county in voteData
    const countyToUpdate = voteData.find(county => county.FIPS === fips);
    if (countyToUpdate) {
        countyToUpdate.Republican = republicanVotes; 
        countyToUpdate.Democrat = democratVotes;    
    }

    // Recalculate the total state votes based on the updated voteData
    let stateTotalRepublican = 0;
    let stateTotalDemocrat = 0;

    voteData.forEach(county => {
        if (county.State === state) {
            stateTotalRepublican += +county.Republican;  
            stateTotalDemocrat += +county.Democrat;
        }
    });

    // Update the voteMap with the new state totals
    voteMap.set(state, {
        totalRepublican: stateTotalRepublican,
        totalDemocrat: stateTotalDemocrat
    });

    // Update the state's color based on the new totals
    updateStateColor(state, voteMap);
});

// Call the function to create the state map
createStateMap();