import * as d3 from 'd3';
import { csv } from 'd3-fetch'; // To load the CSV data

// Declare voteMap globally to store state-level vote totals
let voteMap = new Map();

// Function to create the US states map
function createStateMap() {
    // Load the vote data from usacounty_votes.csv
    d3.csv('data/usacounty_votes.csv').then(voteData => {
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

        // Load the external SVG file (e.g., us-states6.svg)
        d3.xml('data/us-states6.svg').then(data => {
            // Append the loaded SVG to the container
            const importedNode = document.importNode(data.documentElement, true);
            svgContainer.node().appendChild(importedNode);

            // Add interaction and styling for all states
            d3.select(svgContainer.node())
                .selectAll("path")  // Assuming each state is represented by a <path> element in the SVG
                .style("fill", function () {
                    const stateId = this.getAttribute("id");  // Get the state's abbreviation (e.g., "DE" for Delaware)
                    const votes = voteMap.get(stateId);

                    if (votes) {
                        // Color red for Republican majority, blue for Democrat majority
                        return votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
                    } else {
                        return "#d3d3d3";  // Default color if no vote data is found
                    }
                })
                .attr("stroke", "#333")   // Add border for states
                .attr("stroke-width", 1.5)
                .on("mouseover", function (event) {
                    // Tooltip for displaying state information
                    const tooltip = d3.select("#state-tooltip")
                        .attr("class", "tooltip")
                        .style("display", "block");

                    const stateId = this.getAttribute("id");
                    const votes = voteMap.get(stateId);

                    tooltip.html(`State: ${stateId}<br>
                                  Republican: ${votes ? votes.totalRepublican : 'N/A'}<br>
                                  Democrat: ${votes ? votes.totalDemocrat : 'N/A'}`)
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
}

// Listen for county vote updates from index.js and update state colors accordingly
window.addEventListener('countyVoteUpdated', function(e) {
    const { state, republicanVotes, democratVotes } = e.detail;

    // Update the vote totals in voteMap for the corresponding state
    if (voteMap.has(state)) {
        const currentVotes = voteMap.get(state);
        currentVotes.totalRepublican += republicanVotes;
        currentVotes.totalDemocrat += democratVotes;
    } else {
        voteMap.set(state, {
            totalRepublican: republicanVotes,
            totalDemocrat: democratVotes
        });
    }

    // Update the color of the state based on the new vote totals
    updateStateColor(state, voteMap);
});

// Call the function to create the state map
createStateMap();

