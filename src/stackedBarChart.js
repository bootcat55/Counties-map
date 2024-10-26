import * as d3 from 'd3';
import { stateElectoralVotes } from './electoralVotes.js'; // Import state electoral votes

// Function to draw the stacked bar chart with 270 electoral vote marker
export function drawStackedBarChart(results) {
    const svgWidth = 600;
    const svgHeight = 100;
    const svg = d3.select("#election-results-chart").html("") // Clear any previous chart
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const totalVotes = results.republicanVotes + results.democratVotes + results.tooCloseToCallVotes;

    // Scale for bar lengths
    const xScale = d3.scaleLinear()
        .domain([0, totalVotes])
        .range([0, svgWidth]);

    // Draw Democrat bar (on the left side)
    svg.append("rect")
        .attr("x", 0)
        .attr("y", 20)
        .attr("width", xScale(results.democratVotes)) // Democrat votes on the left
        .attr("height", 30)
        .attr("fill", "blue");

    // Draw "too close to call" bar (next to Democrat bar, in the middle)
    svg.append("rect")
        .attr("x", xScale(results.democratVotes)) // Start after Democrats
        .attr("y", 20)
        .attr("width", xScale(results.tooCloseToCallVotes)) // Tied votes in the middle
        .attr("height", 30)
        .attr("fill", "purple");

    // Draw Republican bar (next to "too close to call" bar)
    svg.append("rect")
        .attr("x", xScale(results.democratVotes) + xScale(results.tooCloseToCallVotes)) // Republicans start after ties
        .attr("y", 20)
        .attr("width", xScale(results.republicanVotes)) // Republicans on the right
        .attr("height", 30)
        .attr("fill", "red");

    // Add Democrat label with electoral votes (center of Democrat bar)
    svg.append("text")
        .attr("x", xScale(results.democratVotes) / 2) // Center label in the bar
        .attr("y", 15) // Move the label slightly up
        .attr("text-anchor", "middle")
        .text(`Democrat: ${results.democratVotes} votes`);

    // Add "too close to call" label (center of purple bar)
    if (results.tooCloseToCallVotes > 0) {
        svg.append("text")
            .attr("x", xScale(results.democratVotes) + (xScale(results.tooCloseToCallVotes) / 2)) // Center label in the purple bar
            .attr("y", 15) // Move the label slightly up
            .attr("text-anchor", "middle")
            .text(`Too close to call: ${results.tooCloseToCallVotes} votes`);
    }

    // Add Republican label with electoral votes (center of Republican bar)
    svg.append("text")
        .attr("x", xScale(results.democratVotes) + xScale(results.tooCloseToCallVotes) + (xScale(results.republicanVotes) / 2)) // Center label in the bar
        .attr("y", 15) // Move the label slightly up
        .attr("text-anchor", "middle")
        .text(`Republican: ${results.republicanVotes} votes`);

    // Add 270 electoral vote marker
    const electoralThreshold = 270;
    const markerX = xScale(electoralThreshold); // Position at 270 votes

    svg.append("line")
        .attr("x1", markerX)
        .attr("x2", markerX)
        .attr("y1", 10)
        .attr("y2", 70)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 2"); // Dashed line for 270 votes

    // Add label for 270 marker
    svg.append("text")
        .attr("x", markerX + 5)
        .attr("y", 10)
        .attr("fill", "black")
        .attr("font-size", "12px")
        .text("270 votes");
}

// Helper function to calculate electoral results based on updated voteMap
function calculateElectoralVotesFromMap(voteMap) {
    let republicanVotes = 0;
    let democratVotes = 0;
    let tooCloseToCallVotes = 0;

    voteMap.forEach((votes, state) => {
        if (votes.totalRepublican > votes.totalDemocrat) {
            republicanVotes += stateElectoralVotes[state];
        } else if (votes.totalDemocrat > votes.totalRepublican) {
            democratVotes += stateElectoralVotes[state];
        } else {
            tooCloseToCallVotes += stateElectoralVotes[state];
        }
    });

    return { republicanVotes, democratVotes, tooCloseToCallVotes };
}

// Listen for the stateVoteUpdated event and update the chart
window.addEventListener('stateVoteUpdated', function(e) {
    const voteMap = e.detail.voteMap; // Get updated voteMap from the event
    const electoralResults = calculateElectoralVotesFromMap(voteMap); // Recalculate electoral votes
    drawStackedBarChart(electoralResults); // Redraw the chart with new data
});
