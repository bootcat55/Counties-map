import * as d3 from 'd3';
import { stateElectoralVotes, stateElectoralVotes2024 } from './electoralVotes.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

// Consolidated state data maps
export let voteMap = new Map(); // Tracks state-level vote totals
export let stateColorToggle = new Map(); // Tracks manual color overrides
export let stateLastUpdated = new Map(); // Tracks the source of the last update

let voteData = []; // Stores county-level vote data
let isDefaultVotes = true; // Tracks which set of electoral votes is displayed (2020 or 2024)

// Function to create the US states map
export function createStateMap(filePath = 'data/2024county_votes.csv') {
    // Clear the existing state map
    d3.select("#state-map").html("");

    // Load county-level vote data
    d3.csv(filePath).then(voteDataLoaded => {
        voteData = voteDataLoaded.map(d => ({
            ...d,
            FIPS: +d.FIPS,
            OtherVotes: +d['Other Votes'] || 0
        }));

        // Aggregate vote totals for each state
        const stateVotes = d3.rollups(
            voteData,
            v => ({
                totalRepublican: d3.sum(v, d => +d.Republican),
                totalDemocrat: d3.sum(v, d => +d.Democrat),
                totalOther: d3.sum(v, d => +d.OtherVotes)
            }),
            d => d.State
        );

        // Update the voteMap with state-level vote totals
        voteMap.clear();
        for (const [state, totals] of stateVotes) {
            voteMap.set(state, totals);
        }

        // Create a container for the SVG map
        const svgContainer = d3.select("#state-map")
            .append("div")
            .attr("class", "svg-container");

        // Load the US states SVG file
        d3.xml('data/us-states6.svg').then(data => {
            const importedNode = document.importNode(data.documentElement, true);
            svgContainer.node().appendChild(importedNode);

            const svg = d3.select(svgContainer.node()).select("svg");

            // Display electoral votes on the map
            updateElectoralVotesDisplay(svg);

            // Add a button to toggle electoral votes
            addToggleButton(svg);

            // Render state colors based on vote totals
            updateStateColors(svg);

            // Add tooltip functionality
            const tooltip = d3.select("#state-tooltip")
                .attr("class", "tooltip")
                .style("display", "none");

            // Add mouseover and mouseout events for tooltips
            svg.selectAll("path")
                .on("mouseover", function (event) {
                    const stateId = this.getAttribute("id");
                    const votes = voteMap.get(stateId);
                    const totalVotes = votes.totalRepublican + votes.totalDemocrat + votes.totalOther;
                    const percentageRepublican = (votes.totalRepublican / totalVotes) * 100;
                    const percentageDemocrat = (votes.totalDemocrat / totalVotes) * 100;
                    const percentageOther = (votes.totalOther / totalVotes) * 100;

                    tooltip.html(`
                        <div class="tooltip-header">${stateId}</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Party</th>
                                    <th>Votes</th>
                                    <th>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span style="color: red;">Republican</span></td>
                                    <td>${votes.totalRepublican.toLocaleString()}</td>
                                    <td>${percentageRepublican.toFixed(1)}%</td>
                                </tr>
                                <tr>
                                    <td><span style="color: blue;">Democrat</span></td>
                                    <td>${votes.totalDemocrat.toLocaleString()}</td>
                                    <td>${percentageDemocrat.toFixed(1)}%</td>
                                </tr>
                                <tr>
                                    <td><span style="color: gray;">Other</span></td>
                                    <td>${votes.totalOther.toLocaleString()}</td>
                                    <td>${percentageOther.toFixed(1)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px")
                    .style("display", "block");

                    d3.select(this).style("fill", "lightblue");
                })
                .on("mouseout", function () {
                    tooltip.style("display", "none");

                    const stateId = this.getAttribute("id");

                    // If the state has been manually overridden, use the override color
                    if (stateColorToggle.has(stateId)) {
                        d3.select(this).style("fill", stateColorToggle.get(stateId));
                    } else {
                        // Otherwise, use the vote-based color
                        const votes = voteMap.get(stateId);
                        const defaultColor = votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
                        d3.select(this).style("fill", defaultColor);
                    }
                });

            // Add click event to override state colors
            svg.selectAll("path")
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
                    stateLastUpdated.set(stateId, 'override');

                    const toggleEvent = new CustomEvent('stateColorToggled', { detail: { voteMap, stateColorToggle } });
                    window.dispatchEvent(toggleEvent);
                });
        });
    });
}

// Function to update state colors based on vote totals
export function updateStateColors(svg) {
    svg.selectAll("path").style("fill", function () {
        const stateId = this.getAttribute("id");
        const votes = voteMap.get(stateId);

        // If the state has been manually overridden, use the override color
        if (stateColorToggle.has(stateId)) {
            return stateColorToggle.get(stateId);
        }

        // Otherwise, use the vote-based color
        return votes && votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
    });
}

// Function to update the electoral votes displayed on the map
function updateElectoralVotesDisplay(svg) {
    const electoralVotesData = isDefaultVotes ? stateElectoralVotes : stateElectoralVotes2024;

    svg.selectAll("text.electoral-vote").remove(); // Clear existing electoral vote labels

    svg.selectAll("path").each(function() {
        const stateId = this.getAttribute("id");
        const electoralVotes = electoralVotesData[stateId];

        if (electoralVotes) {
            const bbox = this.getBBox();
            svg.append("text")
                .attr("class", "electoral-vote")
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
}

// Function to add a button on the SVG to toggle electoral votes
function addToggleButton(svg) {
    // Button background
    svg.append("rect")
        .attr("x", 10)
        .attr("y", 10)
        .attr("width", 120)
        .attr("height", 30)
        .attr("fill", "#333")
        .attr("rx", 5)
        .attr("ry", 5)
        .style("cursor", "pointer")
        .on("click", toggleElectoralVotes);

    // Button text
    svg.append("text")
        .attr("x", 70)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "14px")
        .attr("stroke", "none")
        .attr("stroke-width", 0)
        .attr("font-weight", "bold")
        .style("cursor", "pointer")
        .text("2020/2024 EV")
        .on("click", toggleElectoralVotes);
}

// Function to toggle between default and 2024 electoral votes
function toggleElectoralVotes() {
    isDefaultVotes = !isDefaultVotes;
    const svg = d3.select("#state-map").select("svg");
    updateElectoralVotesDisplay(svg);

    // Dispatch an event to update the stacked bar chart
    window.dispatchEvent(new Event('electoralVoteToggle'));
}

// Function to update the state color based on updated vote totals
export function updateStateColor(stateAbbreviation) {
    const svgContainer = d3.select("#state-map").select(".svg-container");
    svgContainer.selectAll("path")
        .filter(function () { return this.getAttribute("id") === stateAbbreviation; })
        .style("fill", function () {
            const votes = voteMap.get(stateAbbreviation);
            const newColor = votes && votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";

            if (stateColorToggle.has(stateAbbreviation) && stateColorToggle.get(stateAbbreviation) !== newColor) {
                stateColorToggle.delete(stateAbbreviation);
            }

            return newColor;
        });

    stateLastUpdated.set(stateAbbreviation, 'voteUpdate');
    window.dispatchEvent(new Event('stateColorChangedByVotes'));
}

// Listen for county vote updates and recalculate state totals
window.addEventListener('countyVoteUpdated', function(e) {
    const { state, republicanVotes, democratVotes, otherVotes, fips } = e.detail;

    const countyToUpdate = voteData.find(county => county.FIPS === fips);
    if (countyToUpdate) {
        countyToUpdate.Republican = republicanVotes; 
        countyToUpdate.Democrat = democratVotes; 
        countyToUpdate.OtherVotes = otherVotes;
    }

    let stateTotalRepublican = 0;
    let stateTotalDemocrat = 0;
    let stateTotalOther = 0;

    voteData.forEach(county => {
        if (county.State === state) {
            stateTotalRepublican += +county.Republican;  
            stateTotalDemocrat += +county.Democrat;
            stateTotalOther += +county.OtherVotes;
        }
    });

    voteMap.set(state, {
        totalRepublican: stateTotalRepublican,
        totalDemocrat: stateTotalDemocrat,
        totalOther: stateTotalOther
    });

    updateStateColor(state);
});

// Initialize the state map with the default dataset
createStateMap();