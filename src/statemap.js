import * as d3 from 'd3';
import { stateElectoralVotes, stateElectoralVotes2024 } from './electoralVotes.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export let voteMap = new Map();
export let stateColorToggle = new Map();
export let stateLastUpdated = new Map();

let voteData = [];
let isDefaultVotes = true;

export function createStateMap(filePath = 'data/2024county_votes.csv') {
    d3.select("#state-map").html("");

    d3.csv(filePath).then(voteDataLoaded => {
        voteData = voteDataLoaded.map(d => ({
            ...d,
            FIPS: +d.FIPS,
            OtherVotes: +d['Other Votes'] || 0
        }));

        const stateVotes = d3.rollups(voteData, v => ({
            totalRepublican: d3.sum(v, d => +d.Republican),
            totalDemocrat: d3.sum(v, d => +d.Democrat),
            totalOther: d3.sum(v, d => +d.OtherVotes)
        }), d => d.State);

        voteMap.clear();
        for (const [state, totals] of stateVotes) voteMap.set(state, totals);

        const svgContainer = d3.select("#state-map").append("div").attr("class", "svg-container");

        d3.xml('data/us-states6.svg').then(data => {
            // Remove any stroke styles from the imported SVG
            const svgElement = data.documentElement;
            svgElement.querySelectorAll('style').forEach(style => style.remove());
            svgElement.querySelectorAll('[stroke]').forEach(el => el.removeAttribute('stroke'));
            svgElement.querySelectorAll('[stroke-width]').forEach(el => el.removeAttribute('stroke-width'));

            const importedNode = document.importNode(svgElement, true);
            svgContainer.node().appendChild(importedNode);
            const svg = d3.select(svgContainer.node()).select("svg");

            addCensusDropdown(svg);
            updateElectoralVotesDisplay(svg);
            updateStateColors(svg);

            // RESTORED TO ORIGINAL TOOLTIP
            const tooltip = d3.select("#state-tooltip")
                .attr("class", "tooltip")
                .style("display", "none");

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
                })
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

function updateElectoralVotesDisplay(svg) {
    const electoralVotesData = isDefaultVotes ? stateElectoralVotes : stateElectoralVotes2024;
    
    svg.selectAll("text.electoral-vote").remove();
    
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
                .attr("stroke-width", "0")
                .style("stroke", "none")
                .style("stroke-width", "0")
                .style("text-shadow", "none")
                .style("filter", "none")
                .style("paint-order", "fill")
                .style("pointer-events", "none")
                .text(electoralVotes);
        }
    });
}

function addCensusDropdown(svg) {
    const dropdown = svg.append("g").attr("class", "census-dropdown").attr("transform", "translate(10, 10)");
    
    dropdown.append("rect")
        .attr("width", 140).attr("height", 30).attr("fill", "#333").style("cursor", "pointer");
    
    const buttonText = dropdown.append("text")
        .attr("x", 70).attr("y", 20).attr("text-anchor", "middle").attr("fill", "white")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer")
        .text(isDefaultVotes ? "2010 Census" : "2020 Census");
    
    const options = dropdown.append("g").style("display", "none");
    
    const opt1 = options.append("g").attr("transform", "translate(0, 30)");
    opt1.append("rect").attr("width", 140).attr("height", 30).attr("fill", isDefaultVotes ? "#555" : "#444")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer")
        .on("click", () => selectCensus(true, svg, buttonText, opt1, opt2, options));
    
    opt1.append("text").attr("x", 70).attr("y", 20).attr("text-anchor", "middle").attr("fill", "white")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer").text("2010 Census")
        .on("click", () => selectCensus(true, svg, buttonText, opt1, opt2, options));
    
    const opt2 = options.append("g").attr("transform", "translate(0, 60)");
    opt2.append("rect").attr("width", 140).attr("height", 30).attr("fill", !isDefaultVotes ? "#555" : "#444")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer")
        .on("click", () => selectCensus(false, svg, buttonText, opt1, opt2, options));
    
    opt2.append("text").attr("x", 70).attr("y", 20).attr("text-anchor", "middle").attr("fill", "white")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer").text("2020 Census")
        .on("click", () => selectCensus(false, svg, buttonText, opt1, opt2, options));
    
    dropdown.on("click", (event) => {
        event.stopPropagation();
        options.style("display", options.style("display") === "block" ? "none" : "block");
    });
    
    svg.on("click", (event) => {
        if (!dropdown.node().contains(event.target)) options.style("display", "none");
    });
    
    function selectCensus(use2010, svg, buttonText, opt1, opt2, options) {
        if (isDefaultVotes !== use2010) {
            isDefaultVotes = use2010;
            updateElectoralVotesDisplay(svg);
            buttonText.text(use2010 ? "2010 Census" : "2020 Census");
            opt1.select("rect").attr("fill", use2010 ? "#555" : "#444");
            opt2.select("rect").attr("fill", !use2010 ? "#555" : "#444");
            window.dispatchEvent(new CustomEvent('apportionmentChanged', {
                detail: { censusYear: use2010 ? '2010' : '2020' }
            }));
        }
        options.style("display", "none");
    }
}

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

createStateMap();