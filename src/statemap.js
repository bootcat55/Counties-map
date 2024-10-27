import * as d3 from 'd3';
import { stateElectoralVotes } from './electoralVotes.js';

// Global vote data map, color toggle, and tracking of last updates
export let voteMap = new Map();
export let stateColorToggle = new Map();
export let stateLastUpdated = new Map(); // Track last update type
let voteData = [];

// Function to create the US states map
export function createStateMap() {
    // Load the vote data from usacounty_votes.csv
    d3.csv('data/usacounty_votes.csv').then(voteDataLoaded => {
        voteData = voteDataLoaded.map(d => ({
            ...d,
            FIPS: +d.FIPS
        }));

        // Aggregate votes by state
        const stateVotes = d3.rollups(
            voteData,
            v => ({
                totalRepublican: d3.sum(v, d => +d.Republican),
                totalDemocrat: d3.sum(v, d => +d.Democrat)
            }),
            d => d.State
        );

        // Populate the global voteMap with state-level totals
        voteMap = new Map(stateVotes);

        // Set up the SVG container for the states map
        const svgContainer = d3.select("#state-map")
            .append("div")
            .attr("class", "svg-container");

        d3.xml('data/us-states6.svg').then(data => {
            const importedNode = document.importNode(data.documentElement, true);
            svgContainer.node().appendChild(importedNode);

            const svg = d3.select(svgContainer.node()).select("svg");

            svg.selectAll("path").each(function() {
                const stateId = this.getAttribute("id");
                const electoralVotes = stateElectoralVotes[stateId];

                if (electoralVotes) {
                    const bbox = this.getBBox();
                    svg.append("text")
                        .attr("x", bbox.x + bbox.width / 2)
                        .attr("y", bbox.y + bbox.height / 2)
                        .attr("text-anchor", "middle")
                        .attr("fill", "white")
                        .attr("font-size", "14px")
                        .attr("font-weight", "bold")
                        .attr("stroke", "none")
                        .attr("stroke-width", 0)
                        .text(electoralVotes);
                }
            });

            // Add interaction and styling for all states
            d3.select(svgContainer.node())
                .selectAll("path")
                .style("fill", function () {
                    const stateId = this.getAttribute("id");
                    const votes = voteMap.get(stateId);
                    return votes && votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
                })
                .attr("stroke", "#333")
                .attr("stroke-width", 1.5)
                .on("click", function() {
                    const stateId = this.getAttribute("id");
                    const currentColor = stateColorToggle.get(stateId) || "blue";
                    let newColor;

                    if (currentColor === "blue") {
                        newColor = "red";
                    } else if (currentColor === "red") {
                        newColor = "gray";
                    } else {
                        newColor = "blue";
                    }

                    d3.select(this).style("fill", newColor);
                    stateColorToggle.set(stateId, newColor);
                    stateLastUpdated.set(stateId, 'override'); // Mark last update as override

                    // Dispatch color toggle event
                    const toggleEvent = new CustomEvent('stateColorToggled', { detail: { voteMap, stateColorToggle } });
                    window.dispatchEvent(toggleEvent);
                })
                .on("mouseover", function (event) {
                    const tooltip = d3.select("#state-tooltip")
                        .attr("class", "tooltip")
                        .style("display", "block");

                    const stateId = this.getAttribute("id");
                    const votes = voteMap.get(stateId);
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

                    d3.select(this).style("fill", "lightblue");  // Temporary color on mouseover
                })
                .on("mouseout", function () {
                    d3.select("#state-tooltip").style("display", "none");

                    const stateId = this.getAttribute("id");

                    // Determine which color to apply based on the last update
                    if (stateLastUpdated.get(stateId) === 'override' && stateColorToggle.has(stateId)) {
                        // Apply override color if it was the last update
                        d3.select(this).style("fill", stateColorToggle.get(stateId));
                    } else {
                        // Otherwise, apply the color based on vote data
                        const votes = voteMap.get(stateId);
                        const defaultColor = votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
                        d3.select(this).style("fill", defaultColor);
                    }
                });
        });
    });
}

// Function to update the state color based on updated vote totals
export function updateStateColor(stateAbbreviation, voteMap) {
    const svgContainer = d3.select("#state-map").select(".svg-container");
    svgContainer.selectAll("path")
        .filter(function () { return this.getAttribute("id") === stateAbbreviation; })
        .style("fill", function () {
            const votes = voteMap.get(stateAbbreviation);
            return votes && votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
        });

    stateLastUpdated.set(stateAbbreviation, 'voteUpdate'); // Mark last update as vote update

    const event = new CustomEvent('stateVoteUpdated', { detail: { voteMap } });
    window.dispatchEvent(event);
}

// Listen for county vote updates and recalculate state totals
window.addEventListener('countyVoteUpdated', function(e) {
    const { state, republicanVotes, democratVotes, fips } = e.detail;

    const countyToUpdate = voteData.find(county => county.FIPS === fips);
    if (countyToUpdate) {
        countyToUpdate.Republican = republicanVotes; 
        countyToUpdate.Democrat = democratVotes;    
    }

    let stateTotalRepublican = 0;
    let stateTotalDemocrat = 0;

    voteData.forEach(county => {
        if (county.State === state) {
            stateTotalRepublican += +county.Republican;  
            stateTotalDemocrat += +county.Democrat;
        }
    });

    voteMap.set(state, {
        totalRepublican: stateTotalRepublican,
        totalDemocrat: stateTotalDemocrat
    });

    updateStateColor(state, voteMap);
});

// Initialize the state map
createStateMap();

