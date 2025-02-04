import * as d3 from 'd3';
import { stateElectoralVotes, stateElectoralVotes2024 } from './electoralVotes.js';
import { voteMap, stateColorToggle, stateLastUpdated } from './stateData.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

// Constants
const BUTTON_WIDTH = 120;
const BUTTON_HEIGHT = 30;
const BUTTON_X = 10;
const BUTTON_Y = 10;
const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 20;

let voteData = [];
let isDefaultVotes = true;  // Track which set of electoral votes is displayed

// Helper function to load and process vote data
const loadAndProcessVoteData = async () => {
    voteData = await d3.csv('data/usacounty_votes.csv').then(data => data.map(d => ({
        ...d,
        FIPS: +d.FIPS,
        OtherVotes: +d['Other Votes'] || 0
    })));

    const stateVotes = d3.rollups(
        voteData,
        v => ({
            totalRepublican: d3.sum(v, d => +d.Republican),
            totalDemocrat: d3.sum(v, d => +d.Democrat),
            totalOther: d3.sum(v, d => +d.OtherVotes)
        }),
        d => d.State
    );

    voteMap.clear();
    for (const [state, totals] of stateVotes) {
        voteMap.set(state, totals);
    }
};

// Helper function to render the state map
const renderStateMap = (svg) => {
    svg.selectAll("path").style("fill", function () {
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
        stateLastUpdated.set(stateId, 'override');

        const toggleEvent = new CustomEvent('stateColorToggled', { detail: { voteMap, stateColorToggle } });
        window.dispatchEvent(toggleEvent);
    });
};

// Helper function to set up tooltips
const setupTooltips = (svg) => {
    svg.selectAll("path")
        .on("mouseover", function (event) {
            const tooltip = d3.select("#state-tooltip")
                .attr("class", "tooltip")
                .style("display", "block");

            const stateId = this.getAttribute("id");
            const votes = voteMap.get(stateId);
            const totalVotes = votes.totalRepublican + votes.totalDemocrat + votes.totalOther;
            const percentageRepublican = (votes.totalRepublican / totalVotes) * 100;
            const percentageDemocrat = (votes.totalDemocrat / totalVotes) * 100;
            const percentageOther = (votes.totalOther / totalVotes) * 100;

            tooltip.html(`
                <strong>State: ${stateId}</strong><br>
                <strong><span style="color: red;">Republican:</span></strong> ${percentageRepublican.toFixed(1)}% (${votes.totalRepublican.toLocaleString()})<br>
                <strong><span style="color: blue;">Democrat:</span></strong> ${percentageDemocrat.toFixed(1)}% (${votes.totalDemocrat.toLocaleString()})<br>
                <strong><span style="color: gray;">Other:</span></strong> ${percentageOther.toFixed(1)}% (${votes.totalOther.toLocaleString()})
            `)
            .style("left", (event.pageX + TOOLTIP_OFFSET_X) + "px")
            .style("top", (event.pageY - TOOLTIP_OFFSET_Y) + "px");

            d3.select(this).style("fill", "lightblue");
        })
        .on("mouseout", function () {
            d3.select("#state-tooltip").style("display", "none");

            const stateId = this.getAttribute("id");

            if (stateLastUpdated.get(stateId) === 'override' && stateColorToggle.has(stateId)) {
                d3.select(this).style("fill", stateColorToggle.get(stateId));
            } else {
                const votes = voteMap.get(stateId);
                const defaultColor = votes.totalRepublican > votes.totalDemocrat ? "red" : "blue";
                d3.select(this).style("fill", defaultColor);
            }
        });
};

// Function to create the US states map
export async function createStateMap() {
    await loadAndProcessVoteData();

    const svgContainer = d3.select("#state-map")
        .append("div")
        .attr("class", "svg-container");

    const svg = await d3.xml('data/us-states6.svg').then(data => {
        const importedNode = document.importNode(data.documentElement, true);
        svgContainer.node().appendChild(importedNode);
        return d3.select(svgContainer.node()).select("svg");
    });

    // Render the state map and set up interactions
    renderStateMap(svg);
    setupTooltips(svg);

    // Display electoral votes on the map
    updateElectoralVotesDisplay(svg);

    // Add a button to toggle electoral votes
    addToggleButton(svg);
}

// Function to update the electoral votes displayed on the map
function updateElectoralVotesDisplay(svg) {
    const electoralVotesData = isDefaultVotes ? stateElectoralVotes : stateElectoralVotes2024;

    svg.selectAll("text.electoral-vote").remove();  // Clear existing electoral vote labels

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
        .attr("x", BUTTON_X)
        .attr("y", BUTTON_Y)
        .attr("width", BUTTON_WIDTH)
        .attr("height", BUTTON_HEIGHT)
        .attr("fill", "#333")
        .attr("rx", 5)
        .attr("ry", 5)
        .style("cursor", "pointer")
        .on("click", toggleElectoralVotes);

    // Button text
    svg.append("text")
        .attr("x", BUTTON_X + BUTTON_WIDTH / 2)
        .attr("y", BUTTON_Y + BUTTON_HEIGHT / 2 + 5)
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

// Initialize the state map
createStateMap();