import * as d3 from 'd3';
import { stateElectoralVotes, stateElectoralVotes2024 } from './electoralVotes.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export let voteMap = new Map();
export let stateColorToggle = new Map();
export let stateLastUpdated = new Map();

let voteData = [];
let isDefaultVotes = false; // Default to 2020 Census (2024 electoral votes)
let showSwingStates = false;

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
        for (const [state, totals] of stateVotes) {
            voteMap.set(state, totals);
        }

        const svgContainer = d3.select("#state-map").append("div").attr("class", "svg-container");

        d3.xml('data/us-states6.svg').then(data => {
            const svgElement = data.documentElement;
            svgElement.querySelectorAll('style').forEach(style => style.remove());
            svgElement.querySelectorAll('[stroke]').forEach(el => el.removeAttribute('stroke'));
            svgElement.querySelectorAll('[stroke-width]').forEach(el => el.removeAttribute('stroke-width'));

            const importedNode = document.importNode(svgElement, true);
            svgContainer.node().appendChild(importedNode);
            const svg = d3.select(svgContainer.node()).select("svg");

            // Create a container for UI controls at the top of the SVG
            const uiContainer = svg.append("g")
                .attr("class", "ui-container")
                .attr("transform", "translate(10, 10)");

            // Add census dropdown first (will be underneath)
            addCensusDropdown(uiContainer, svg);
            
            // Add swing state toggle second (will be on top)
            addSwingStateToggle(uiContainer, svg);

            updateElectoralVotesDisplay(svg);
            updateStateColors(svg);

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
                        d3.select(this).style("fill", getStateColor(stateId, votes));
                    }
                })
                .on("click", function() {
                    const stateId = this.getAttribute("id");
                    const newColor = getNextOverrideColor(stateId);
                    
                    d3.select(this).style("fill", newColor);
                    stateColorToggle.set(stateId, newColor);
                    stateLastUpdated.set(stateId, 'override');

                    const toggleEvent = new CustomEvent('stateColorToggled', { detail: { voteMap, stateColorToggle } });
                    window.dispatchEvent(toggleEvent);
                });
        });
    });
}

// Function to get the next override color when clicking a state
function getNextOverrideColor(stateId) {
    const currentColor = stateColorToggle.get(stateId);
    
    if (showSwingStates) {
        // Swing states mode: cycle through 7 colors
        const swingColors = [
            "#8B0000", // Safe Red
            "#DC143C", // Likely Red  
            "#FF6B6B", // Lean Red
            "gray",    // Toss-up
            "#87CEFA", // Lean Blue
            "#1E90FF", // Likely Blue
            "#00008B"  // Safe Blue
        ];
        
        if (!currentColor) {
            // No current override, start with Safe Red
            return "#8B0000";
        }
        
        const currentIndex = swingColors.indexOf(currentColor);
        if (currentIndex === -1) {
            // Current color not in swing colors (e.g., from simple mode), start fresh
            return "#8B0000";
        }
        
        // Cycle to next color
        const nextIndex = (currentIndex + 1) % swingColors.length;
        return swingColors[nextIndex];
    } else {
        // Simple mode: cycle through 3 basic colors
        const simpleColors = ["blue", "red", "gray"];
        
        if (!currentColor) {
            // No current override, start with blue
            return "blue";
        }
        
        // Check if current color is in simple colors
        if (simpleColors.includes(currentColor)) {
            const currentIndex = simpleColors.indexOf(currentColor);
            const nextIndex = (currentIndex + 1) % simpleColors.length;
            return simpleColors[nextIndex];
        } else {
            // Current color is from swing mode, convert to nearest simple color
            if (currentColor === "#8B0000" || currentColor === "#DC143C" || currentColor === "#FF6B6B") {
                return "red";
            } else if (currentColor === "#00008B" || currentColor === "#1E90FF" || currentColor === "#87CEFA") {
                return "blue";
            } else {
                return "gray";
            }
        }
    }
}

// Function to get state color based on swing state mode
function getStateColor(stateId, votes, ignoreOverride = false) {
    // If manually overridden and not ignoring overrides, use override color
    if (!ignoreOverride && stateColorToggle.has(stateId)) {
        const overrideColor = stateColorToggle.get(stateId);
        
        // If we're in simple mode but override is a swing color, convert it
        if (!showSwingStates && overrideColor !== "red" && overrideColor !== "blue" && overrideColor !== "gray") {
            if (overrideColor === "#8B0000" || overrideColor === "#DC143C" || overrideColor === "#FF6B6B") {
                return "red";
            } else if (overrideColor === "#00008B" || overrideColor === "#1E90FF" || overrideColor === "#87CEFA") {
                return "blue";
            } else {
                return "gray";
            }
        }
        
        // If we're in swing mode but override is a simple color, convert it
        if (showSwingStates && (overrideColor === "red" || overrideColor === "blue" || overrideColor === "gray")) {
            if (overrideColor === "red") return "#FF6B6B"; // Default to Lean Red
            if (overrideColor === "blue") return "#87CEFA"; // Default to Lean Blue
            return "gray";
        }
        
        return overrideColor;
    }

    if (!votes) return "gray";
    
    const totalVotes = votes.totalRepublican + votes.totalDemocrat + votes.totalOther;
    if (totalVotes === 0) return "gray";
    
    const repPercentage = (votes.totalRepublican / totalVotes) * 100;
    const demPercentage = (votes.totalDemocrat / totalVotes) * 100;
    const margin = Math.abs(repPercentage - demPercentage);
    
    if (showSwingStates) {
        // 7-color mode: 3 reds, 3 blues, 1 gray for toss-up
        if (repPercentage > demPercentage) {
            // Republican leading
            if (margin > 15) return "#8B0000"; // Safe Red (dark red)
            if (margin > 8) return "#DC143C"; // Likely Red (crimson)
            return "#FF6B6B"; // Lean Red (light red)
        } else if (demPercentage > repPercentage) {
            // Democrat leading
            if (margin > 15) return "#00008B"; // Safe Blue (dark blue)
            if (margin > 8) return "#1E90FF"; // Likely Blue (dodger blue)
            return "#87CEFA"; // Lean Blue (light sky blue)
        } else {
            return "gray"; // Toss-up (exact tie)
        }
    } else {
        // Simple mode: just red, blue, or gray
        return votes.totalRepublican > votes.totalDemocrat ? "red" : 
               votes.totalDemocrat > votes.totalRepublican ? "blue" : "gray";
    }
}

// Function to update state colors based on vote totals
export function updateStateColors(svg) {
    svg.selectAll("path").style("fill", function () {
        const stateId = this.getAttribute("id");
        const votes = voteMap.get(stateId);
        return getStateColor(stateId, votes);
    });
}

// Function to update the electoral votes displayed on the map
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

// Function to add census apportionment dropdown
function addCensusDropdown(uiContainer, svg) {
    const dropdown = uiContainer.append("g")
        .attr("class", "census-dropdown")
        .attr("transform", "translate(0, 0)"); // Position within UI container
    
    dropdown.append("rect")
        .attr("width", 140).attr("height", 30).attr("fill", "#333").style("cursor", "pointer");
    
    const buttonText = dropdown.append("text")
        .attr("x", 70).attr("y", 20).attr("text-anchor", "middle").attr("fill", "white")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer")
        .text(isDefaultVotes ? "2010 Census" : "2020 Census");
    
    // Create dropdown options as a separate group appended directly to SVG (not uiContainer)
    // This ensures it appears above everything else
    const options = svg.append("g")
        .attr("class", "census-dropdown-options")
        .attr("transform", "translate(10, 10)")
        .style("display", "none");
    
    const opt1 = options.append("g").attr("transform", "translate(0, 30)");
    opt1.append("rect")
        .attr("width", 140).attr("height", 30)
        .attr("fill", isDefaultVotes ? "#555" : "#444")
        .attr("stroke", "none").attr("stroke-width", "0")
        .style("cursor", "pointer")
        .on("click", () => selectCensus(true, svg, buttonText, opt1, opt2, options));
    
    opt1.append("text")
        .attr("x", 70).attr("y", 20).attr("text-anchor", "middle").attr("fill", "white")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer")
        .text("2010 Census")
        .on("click", () => selectCensus(true, svg, buttonText, opt1, opt2, options));
    
    const opt2 = options.append("g").attr("transform", "translate(0, 60)");
    opt2.append("rect")
        .attr("width", 140).attr("height", 30)
        .attr("fill", !isDefaultVotes ? "#555" : "#444")
        .attr("stroke", "none").attr("stroke-width", "0")
        .style("cursor", "pointer")
        .on("click", () => selectCensus(false, svg, buttonText, opt1, opt2, options));
    
    opt2.append("text")
        .attr("x", 70).attr("y", 20).attr("text-anchor", "middle").attr("fill", "white")
        .attr("stroke", "none").attr("stroke-width", "0").style("cursor", "pointer")
        .text("2020 Census")
        .on("click", () => selectCensus(false, svg, buttonText, opt1, opt2, options));
    
    dropdown.on("click", (event) => {
        event.stopPropagation();
        options.style("display", options.style("display") === "block" ? "none" : "block");
    });
    
    svg.on("click", (event) => {
        if (!dropdown.node().contains(event.target) && !options.node().contains(event.target)) {
            options.style("display", "none");
        }
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

// Function to add swing state toggle button
function addSwingStateToggle(uiContainer, svg) {
    const toggleGroup = uiContainer.append("g")
        .attr("class", "swing-state-toggle")
        .attr("transform", "translate(0, 40)"); // Positioned 40px below census dropdown
    
    // Toggle button background
    toggleGroup.append("rect")
        .attr("width", 140)
        .attr("height", 30)
        .attr("fill", showSwingStates ? "#4CAF50" : "#333")
        .attr("rx", 4)
        .attr("ry", 4)
        .style("cursor", "pointer")
        .on("click", function() {
            showSwingStates = !showSwingStates;
            updateToggleVisuals();
            updateStateColors(svg);
        });
    
    // Toggle button text
    const toggleText = toggleGroup.append("text")
        .attr("x", 70)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "12px")
        .attr("stroke", "none")
        .attr("stroke-width", "0")
        .style("cursor", "pointer")
        .text(showSwingStates ? "Swing States: ON" : "Swing States: OFF")
        .on("click", function() {
            showSwingStates = !showSwingStates;
            updateToggleVisuals();
            updateStateColors(svg);
        });
    
    // Legend for swing states - append directly to SVG to ensure proper layering
    const legend = svg.append("g")
        .attr("class", "swing-state-legend")
        .attr("transform", "translate(160, 50)")
        .style("opacity", 0)
        .style("pointer-events", "none");
    
    // Legend background
    legend.append("rect")
        .attr("width", 120)
        .attr("height", 140)
        .attr("fill", "white")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1)
        .attr("rx", 4)
        .attr("ry", 4);
    
    // Legend title
    legend.append("text")
        .attr("x", 60)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text("Swing State Colors");
    
    // Legend items
    const legendItems = [
        { color: "#8B0000", label: "Safe R (>15%)" },
        { color: "#DC143C", label: "Likely R (8-15%)" },
        { color: "#FF6B6B", label: "Lean R (<8%)" },
        { color: "gray", label: "Toss-up" },
        { color: "#87CEFA", label: "Lean D (<8%)" },
        { color: "#1E90FF", label: "Likely D (8-15%)" },
        { color: "#00008B", label: "Safe D (>15%)" }
    ];
    
    legendItems.forEach((item, index) => {
        const y = 35 + index * 15;
        
        // Color box
        legend.append("rect")
            .attr("x", 10)
            .attr("y", y - 6)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", item.color)
            .attr("stroke", "#666")
            .attr("stroke-width", 0.5);
        
        // Label
        legend.append("text")
            .attr("x", 25)
            .attr("y", y)
            .attr("font-size", "10px")
            .text(item.label);
    });
    
    // Show legend on hover
    toggleGroup.on("mouseover", function() {
        legend.transition().duration(200).style("opacity", 0.9);
    }).on("mouseout", function() {
        legend.transition().duration(200).style("opacity", 0);
    });
    
    function updateToggleVisuals() {
        toggleGroup.select("rect").attr("fill", showSwingStates ? "#4CAF50" : "#333");
        toggleText.text(showSwingStates ? "Swing States: ON" : "Swing States: OFF");
    }
}

// Function to update the state color based on updated vote totals
export function updateStateColor(stateAbbreviation) {
    const svgContainer = d3.select("#state-map").select(".svg-container");
    
    // When votes are updated via sliders, remove any manual override for this state
    if (stateColorToggle.has(stateAbbreviation)) {
        stateColorToggle.delete(stateAbbreviation);
    }
    
    svgContainer.selectAll("path")
        .filter(function () { return this.getAttribute("id") === stateAbbreviation; })
        .style("fill", function () {
            const votes = voteMap.get(stateAbbreviation);
            // Use getStateColor with ignoreOverride = true to ensure we get vote-based color
            return getStateColor(stateAbbreviation, votes, true);
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

createStateMap();