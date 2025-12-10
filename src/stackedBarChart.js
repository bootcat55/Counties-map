import * as d3 from 'd3';
import { stateElectoralVotes, stateElectoralVotes2024 } from './electoralVotes.js';
import { voteMap, stateColorToggle } from './statemap.js';

let use2024Votes = false;
let updateTimeout = null;
let elements = null;
let currentResults = { republicanVotes: 0, democratVotes: 0, tooCloseToCallVotes: 0 };

// Function to draw the stacked bar chart
export function drawStackedBarChart(newResults) {
    const svg = d3.select("#election-results-chart");
    const svgWidth = 600;
    const svgHeight = 100;
    
    const totalVotes = newResults.republicanVotes + newResults.democratVotes + newResults.tooCloseToCallVotes;
    const xScale = d3.scaleLinear().domain([0, totalVotes]).range([0, svgWidth]);

    // Create or update SVG
    let chartSvg = svg.select("svg");
    if (chartSvg.empty()) {
        chartSvg = svg.html("").append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .attr("class", "animated-chart");
        
        // Store element references
        elements = {
            democratBar: chartSvg.append("rect").attr("class", "democrat-bar").attr("y", 20).attr("height", 30).attr("fill", "blue"),
            tctcBar: chartSvg.append("rect").attr("class", "tctc-bar").attr("y", 20).attr("height", 30).attr("fill", "purple"),
            republicanBar: chartSvg.append("rect").attr("class", "republican-bar").attr("y", 20).attr("height", 30).attr("fill", "red"),
            labels: {
                democrat: chartSvg.append("text").attr("class", "chart-label democrat-label").attr("y", 15).attr("text-anchor", "middle"),
                tctc: chartSvg.append("text").attr("class", "chart-label tctc-label").attr("y", 15).attr("text-anchor", "middle"),
                republican: chartSvg.append("text").attr("class", "chart-label republican-label").attr("y", 15).attr("text-anchor", "middle")
            }
        };
        
        // Static 270 marker
        const markerX = xScale(270);
        chartSvg.append("line")
            .attr("class", "threshold-marker")
            .attr("x1", markerX).attr("x2", markerX)
            .attr("y1", 10).attr("y2", 70)
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4 2");
        
        chartSvg.append("text")
            .attr("class", "marker-label")
            .attr("x", markerX + 5).attr("y", 10)
            .attr("fill", "black")
            .text("270 votes");
    }

    // Update bars (CSS handles animation)
    elements.democratBar.attr("width", xScale(newResults.democratVotes));
    elements.tctcBar
        .attr("x", xScale(newResults.democratVotes))
        .attr("width", xScale(newResults.tooCloseToCallVotes));
    elements.republicanBar
        .attr("x", xScale(newResults.democratVotes + newResults.tooCloseToCallVotes))
        .attr("width", xScale(newResults.republicanVotes));

    // Update labels with counting animation
    updateLabelsWithCount(newResults, xScale);
    currentResults = { ...newResults };
}

// Smooth number counting animation
function countAnimation(element, start, end, duration = 500) {
    if (start === end) return;
    
    const startTime = Date.now();
    const range = end - start;
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const current = Math.round(start + (range * eased));
        
        element.text(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Update labels with counting animation
function updateLabelsWithCount(newResults, xScale) {
    // Democrat label
    const demStart = currentResults.democratVotes;
    const demEnd = newResults.democratVotes;
    elements.labels.democrat
        .text(demStart)
        .attr("x", xScale(newResults.democratVotes) / 2);
    
    countAnimation(elements.labels.democrat, demStart, demEnd);
    elements.labels.democrat.node().textContent = `Democrat: ${demStart}`;

    // TCTC label
    if (newResults.tooCloseToCallVotes > 0) {
        const tctcStart = currentResults.tooCloseToCallVotes;
        const tctcEnd = newResults.tooCloseToCallVotes;
        elements.labels.tctc
            .text(tctcStart)
            .attr("x", xScale(newResults.democratVotes) + (xScale(newResults.tooCloseToCallVotes) / 2))
            .style("opacity", 1);
        
        countAnimation(elements.labels.tctc, tctcStart, tctcEnd);
        elements.labels.tctc.node().textContent = `Too close: ${tctcStart}`;
    } else {
        elements.labels.tctc.style("opacity", 0);
    }

    // Republican label
    const repStart = currentResults.republicanVotes;
    const repEnd = newResults.republicanVotes;
    elements.labels.republican
        .text(repStart)
        .attr("x", xScale(newResults.democratVotes + newResults.tooCloseToCallVotes) + (xScale(newResults.republicanVotes) / 2));
    
    countAnimation(elements.labels.republican, repStart, repEnd);
    elements.labels.republican.node().textContent = `Republican: ${repStart}`;
}

// Calculate electoral votes
function calculateElectoralVotesFromMap() {
    let republicanVotes = 0, democratVotes = 0, tooCloseToCallVotes = 0;
    const electoralVotesData = use2024Votes ? stateElectoralVotes2024 : stateElectoralVotes;

    voteMap.forEach((votes, state) => {
        const overrideColor = stateColorToggle.get(state);
        const ev = electoralVotesData[state];

        if (overrideColor === "red") republicanVotes += ev;
        else if (overrideColor === "blue") democratVotes += ev;
        else if (overrideColor === "gray") tooCloseToCallVotes += ev;
        else {
            const totalVotes = votes.totalRepublican + votes.totalDemocrat + votes.totalOther;
            if (totalVotes === 0) tooCloseToCallVotes += ev;
            else if (votes.totalRepublican > votes.totalDemocrat) republicanVotes += ev;
            else if (votes.totalDemocrat > votes.totalRepublican) democratVotes += ev;
            else tooCloseToCallVotes += ev;
        }
    });

    return { republicanVotes, democratVotes, tooCloseToCallVotes };
}

// Throttled update
function updateChart() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        drawStackedBarChart(calculateElectoralVotesFromMap());
    }, 100);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    const results = calculateElectoralVotesFromMap();
    currentResults = { ...results };
    drawStackedBarChart(results);
});

// Event listeners
['countyVoteUpdated', 'stateColorToggled', 'stateColorChangedByVotes'].forEach(event => {
    window.addEventListener(event, updateChart);
});

window.addEventListener('electoralVoteToggle', () => {
    use2024Votes = !use2024Votes;
    updateChart();
});