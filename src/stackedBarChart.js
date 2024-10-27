import * as d3 from 'd3';
import { stateElectoralVotes } from './electoralVotes.js';
import { voteMap, stateColorToggle } from './statemap.js';

// Function to draw the stacked bar chart with a 270 electoral vote marker
export function drawStackedBarChart(results) {
    const svgWidth = 600;
    const svgHeight = 100;
    const svg = d3.select("#election-results-chart").html("") // Clear any previous chart
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const totalVotes = results.republicanVotes + results.democratVotes + results.tooCloseToCallVotes;

    const xScale = d3.scaleLinear()
        .domain([0, totalVotes])
        .range([0, svgWidth]);

    // Draw Democrat bar (blue)
    svg.append("rect")
        .attr("x", 0)
        .attr("y", 20)
        .attr("width", xScale(results.democratVotes))
        .attr("height", 30)
        .attr("fill", "blue");

    // Draw "Too Close to Call" bar (purple)
    svg.append("rect")
        .attr("x", xScale(results.democratVotes))
        .attr("y", 20)
        .attr("width", xScale(results.tooCloseToCallVotes))
        .attr("height", 30)
        .attr("fill", "purple");

    // Draw Republican bar (red)
    svg.append("rect")
        .attr("x", xScale(results.democratVotes) + xScale(results.tooCloseToCallVotes))
        .attr("y", 20)
        .attr("width", xScale(results.republicanVotes))
        .attr("height", 30)
        .attr("fill", "red");

    // Add labels for each section
    svg.append("text")
        .attr("x", xScale(results.democratVotes) / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .text(`Democrat: ${results.democratVotes} votes`);

    if (results.tooCloseToCallVotes > 0) {
        svg.append("text")
            .attr("x", xScale(results.democratVotes) + (xScale(results.tooCloseToCallVotes) / 2))
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .text(`Too close to call: ${results.tooCloseToCallVotes} votes`);
    }

    svg.append("text")
        .attr("x", xScale(results.democratVotes) + xScale(results.tooCloseToCallVotes) + (xScale(results.republicanVotes) / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .text(`Republican: ${results.republicanVotes} votes`);

    // Add 270 electoral vote marker
    const electoralThreshold = 270;
    const markerX = xScale(electoralThreshold);

    svg.append("line")
        .attr("x1", markerX)
        .attr("x2", markerX)
        .attr("y1", 10)
        .attr("y2", 70)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 2");

    svg.append("text")
        .attr("x", markerX + 5)
        .attr("y", 10)
        .attr("fill", "black")
        .attr("font-size", "12px")
        .text("270 votes");
}

// Helper function to calculate electoral results based on the current state color
function calculateElectoralVotesFromMap(voteMap, stateColorToggle) {
    let republicanVotes = 0;
    let democratVotes = 0;
    let tooCloseToCallVotes = 0;

    voteMap.forEach((votes, state) => {
        // Check for a manual override color
        const overrideColor = stateColorToggle.get(state);

        if (overrideColor === "red") {
            republicanVotes += stateElectoralVotes[state];
        } else if (overrideColor === "blue") {
            democratVotes += stateElectoralVotes[state];
        } else if (overrideColor === "gray") {
            tooCloseToCallVotes += stateElectoralVotes[state];
        } else {
            // No override, use actual vote comparison
            if (votes.totalRepublican > votes.totalDemocrat) {
                republicanVotes += stateElectoralVotes[state];
            } else if (votes.totalDemocrat > votes.totalRepublican) {
                democratVotes += stateElectoralVotes[state];
            } else {
                tooCloseToCallVotes += stateElectoralVotes[state];
            }
        }
    });

    return { republicanVotes, democratVotes, tooCloseToCallVotes };
}

// Listen for both vote-based and override-based state color changes
window.addEventListener('countyVoteUpdated', function() {
    const electoralResults = calculateElectoralVotesFromMap(voteMap, stateColorToggle);
    drawStackedBarChart(electoralResults);
});

window.addEventListener('stateColorToggled', function() {
    const electoralResults = calculateElectoralVotesFromMap(voteMap, stateColorToggle);
    drawStackedBarChart(electoralResults);
});

// New listener to update the chart whenever state colors change due to county vote updates
window.addEventListener('stateColorChangedByVotes', function() {
    const electoralResults = calculateElectoralVotesFromMap(voteMap, stateColorToggle);
    drawStackedBarChart(electoralResults);
});
