import * as d3 from 'd3';
import { stateElectoralVotes, stateElectoralVotes2024 } from './electoralVotes.js';
import { voteMap, stateColorToggle } from './stateData.js';

let use2024Votes = false;  // Track whether to use 2024 electoral votes

// Function to draw the stacked bar chart with a 270 electoral vote marker
export function drawStackedBarChart(results) {
    const container = d3.select("#election-results-chart");
    const containerWidth = container.node().getBoundingClientRect().width; // Get container width
    const svgHeight = 100;

    // Clear any previous chart
    container.html("");

    const svg = container.append("svg")
        .attr("width", containerWidth) // Use container width
        .attr("height", svgHeight);

    const totalVotes = results.republicanVotes + results.democratVotes + results.tooCloseToCallVotes;

    const xScale = d3.scaleLinear()
        .domain([0, totalVotes])
        .range([0, containerWidth]); // Scale based on container width

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

// Improved electoral votes calculation based on vote data and override checks
function calculateElectoralVotesFromMap(voteMap, stateColorToggle) {
    let republicanVotes = 0;
    let democratVotes = 0;
    let tooCloseToCallVotes = 0;

    // Choose the correct electoral vote data set based on the toggle
    const electoralVotesData = use2024Votes ? stateElectoralVotes2024 : stateElectoralVotes;

    voteMap.forEach((votes, state) => {
        // Check for a manual override color
        const overrideColor = stateColorToggle.get(state);

        if (overrideColor === "red") {
            republicanVotes += electoralVotesData[state];
        } else if (overrideColor === "blue") {
            democratVotes += electoralVotesData[state];
        } else if (overrideColor === "gray") {
            tooCloseToCallVotes += electoralVotesData[state];
        } else {
            // No override, use actual vote comparison based on percentages
            const totalVotes = votes.totalRepublican + votes.totalDemocrat + votes.totalOther;
            const percentageRepublican = (votes.totalRepublican / totalVotes) * 100;
            const percentageDemocrat = (votes.totalDemocrat / totalVotes) * 100;

            if (percentageRepublican > percentageDemocrat) {
                republicanVotes += electoralVotesData[state];
            } else if (percentageDemocrat > percentageRepublican) {
                democratVotes += electoralVotesData[state];
            } else {
                tooCloseToCallVotes += electoralVotesData[state];
            }
        }
    });

    return { republicanVotes, democratVotes, tooCloseToCallVotes };
}

// Update the chart based on county vote updates, state color toggles, or electoral vote toggle
function updateChart() {
    const electoralResults = calculateElectoralVotesFromMap(voteMap, stateColorToggle);
    drawStackedBarChart(electoralResults);
}

// Event listeners to handle all necessary updates for stacked bar chart
window.addEventListener('countyVoteUpdated', updateChart);
window.addEventListener('stateColorToggled', updateChart);
window.addEventListener('stateColorChangedByVotes', updateChart);

// Listen for the toggle event from the state map to switch between 2024 and default electoral votes
window.addEventListener('electoralVoteToggle', () => {
    use2024Votes = !use2024Votes;
    updateChart();  // Redraw the chart with updated electoral votes
});