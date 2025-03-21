import * as d3 from 'd3';
import { selectedCounties } from './mouseEvents.js';

// Function to create the info pane
export function createInfoPane() {
    return d3.select("#info-container")
        .attr("class", "info-pane");
}

// Function to update the info pane with aggregated data
export function updateInfoPane(infoPane, data) {
    const { counties, aggregatedVotes, totalVotes, stateTotalPopulation, countyType } = data;

    // Ensure counties is always an array
    const countiesArray = Array.isArray(counties) ? counties : [counties];

    // Calculate total population and total votes across all selected counties
    const totalPopulation = countiesArray.reduce((sum, county) => sum + (county.Population || 0), 0);
    const totalVotesAcrossCounties = countiesArray.reduce((sum, county) => sum + (county.Republican || 0) + (county.Democrat || 0) + (county.OtherVotes || 0), 0);

    // Calculate turnout based on the total population and total votes
    const turnout = totalPopulation > 0 ? ((totalVotesAcrossCounties / totalPopulation) * 100).toFixed(1) : "0.0";

    // Calculate votes and percentages
    const republicanVotes = aggregatedVotes?.Republican || countiesArray.reduce((sum, county) => sum + (county.Republican || 0), 0);
    const democratVotes = aggregatedVotes?.Democrat || countiesArray.reduce((sum, county) => sum + (county.Democrat || 0), 0);
    const otherVotes = aggregatedVotes?.OtherVotes || countiesArray.reduce((sum, county) => sum + (county.OtherVotes || 0), 0);

    const totalVotesCalc = republicanVotes + democratVotes + otherVotes;
    const percentageRepublican = totalVotesCalc > 0 ? ((republicanVotes / totalVotesCalc) * 100).toFixed(1) : "0.0";
    const percentageDemocrat = totalVotesCalc > 0 ? ((democratVotes / totalVotesCalc) * 100).toFixed(1) : "0.0";
    const percentageOther = totalVotesCalc > 0 ? ((otherVotes / totalVotesCalc) * 100).toFixed(1) : "0.0";

    // Update the info pane with the aggregated data
    infoPane.html(`
        <div class="info-pane-header">${countiesArray.length > 1 ? "Multiple Counties" : `${countiesArray[0].County}, ${countiesArray[0].State}`}</div>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Population</td>
                    <td>${totalPopulation.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>State Total Population</td>
                    <td>${stateTotalPopulation.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Vote Turnout<sub>0</sub></td>
                    <td>${turnout}%</td>
                </tr>
                <tr>
                    <td>Type</td>
                    <td>${countyType}</td>
                </tr>
                <tr>
                    <td><span class="winner-republican">Republican Votes</span></td>
                    <td>${republicanVotes.toLocaleString()} (${percentageRepublican}%)</td>
                </tr>
                <tr>
                    <td><span class="winner-democrat">Democrat Votes</span></td>
                    <td>${democratVotes.toLocaleString()} (${percentageDemocrat}%)</td>
                </tr>
                <tr>
                    <td><span style="color: gray;">Other Votes</span></td>
                    <td>${otherVotes.toLocaleString()} (${percentageOther}%)</td>
                </tr>
            </tbody>
        </table>
    `).style("display", "block");

    // Update the bar chart with the new data
    updateBarChart({
        republicanVotes,
        democratVotes,
        otherVotes
    });
}

// Function to create the update pane with sliders and bar chart
export function createUpdatePane() {
    const updatePane = d3.select("#update-container")
        .attr("class", "update-pane");

    // Create a container for the bar chart
    const barChartContainer = updatePane.append("div")
        .attr("class", "bar-chart-container");

    // Create the bar chart SVG
    barChartContainer.append("svg")
        .attr("id", "bar-chart")
        .attr("width", 200)
        .attr("height", 150);

    // Create the form for sliders
    const updateForm = updatePane.append("form");

    updateForm.append("div").attr("id", "voting-info").style("margin-bottom", "10px");

    const createSlider = (labelText, id, percentageId, color) => {
        updateForm.append("label")
            .html(`<span style="font-weight: bold; color: ${color};">${labelText}</span> <span id="${percentageId}">(0%)</span>`);
        return updateForm.append("input")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 100)
            .attr("value", 33)
            .attr("id", id);
    };

    const repSlider = createSlider("Republican:", "repSlider", "repPercentage", "red");
    const demSlider = createSlider("Democrat:", "demSlider", "demPercentage", "blue");
    const otherSlider = createSlider("Other:", "otherSlider", "otherPercentage", "purple");

    const submitButton = updateForm.append("button").text("Update Votes");
    const resetButton = updateForm.append("button").text("Reset County").attr("class", "reset-button");

    return { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton };
}

// Function to update the bar chart with percentage swing
export function updateBarChart(data, containerId = "#bar-chart") {
    const { republicanVotes, democratVotes, otherVotes } = data;

    // Clear any existing chart
    d3.select(containerId).selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 20, right: 10, bottom: 30, left: 10 };
    const width = 200 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select(containerId)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Calculate total votes for the selected counties
    const totalVotes = republicanVotes + democratVotes + otherVotes;

    // Calculate original vote percentages for the selected counties
    const originalRepublicanVotes = selectedCounties.reduce((sum, county) => sum + (county.originalVotes?.Republican || 0), 0);
    const originalDemocratVotes = selectedCounties.reduce((sum, county) => sum + (county.originalVotes?.Democrat || 0), 0);
    const originalOtherVotes = selectedCounties.reduce((sum, county) => sum + (county.originalVotes?.OtherVotes || 0), 0);
    const originalTotalVotes = originalRepublicanVotes + originalDemocratVotes + originalOtherVotes;

    const originalRepPercentage = originalTotalVotes > 0 ? (originalRepublicanVotes / originalTotalVotes) * 100 : 0;
    const originalDemPercentage = originalTotalVotes > 0 ? (originalDemocratVotes / originalTotalVotes) * 100 : 0;
    const originalOtherPercentage = originalTotalVotes > 0 ? (originalOtherVotes / originalTotalVotes) * 100 : 0;

    // Calculate current vote percentages
    const currentRepPercentage = totalVotes > 0 ? (republicanVotes / totalVotes) * 100 : 0;
    const currentDemPercentage = totalVotes > 0 ? (democratVotes / totalVotes) * 100 : 0;
    const currentOtherPercentage = totalVotes > 0 ? (otherVotes / totalVotes) * 100 : 0;

    // Calculate percentage swing
    const repSwing = currentRepPercentage - originalRepPercentage;
    const demSwing = currentDemPercentage - originalDemPercentage;
    const otherSwing = currentOtherPercentage - originalOtherPercentage;

    // Cap swings at ±50%
    const cappedRepSwing = Math.max(-50, Math.min(50, repSwing));
    const cappedDemSwing = Math.max(-50, Math.min(50, demSwing));
    const cappedOtherSwing = Math.max(-50, Math.min(50, otherSwing));

    // Define scales
    const x = d3.scaleBand()
        .domain(["Republican", "Democrat", "Other"])
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([-50, 50]) // Cap swings at ±50%
        .range([height, 0]);

    // Add bars for percentage swing
    svg.selectAll(".bar")
        .data([
            { party: "Republican", swing: cappedRepSwing, originalSwing: repSwing },
            { party: "Democrat", swing: cappedDemSwing, originalSwing: demSwing },
            { party: "Other", swing: cappedOtherSwing, originalSwing: otherSwing }
        ])
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.party))
        .attr("y", d => y(Math.max(0, d.swing))) // Start bars at 0 for positive swings
        .attr("width", x.bandwidth())
        .attr("height", d => Math.abs(y(0) - y(d.swing))) // Height based on capped swing magnitude
        .attr("fill", d => {
            if (d.party === "Republican") return "red";
            if (d.party === "Democrat") return "blue";
            return "gray";
        });

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add y-axis (optional, for reference)
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));

    // Add labels for percentage swing
    svg.selectAll(".label")
        .data([
            { party: "Republican", swing: cappedRepSwing, originalSwing: repSwing },
            { party: "Democrat", swing: cappedDemSwing, originalSwing: demSwing },
            { party: "Other", swing: cappedOtherSwing, originalSwing: otherSwing }
        ])
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.party) + x.bandwidth() / 2)
        .attr("y", d => y(d.swing) - 5)
        .attr("text-anchor", "middle")
        .text(d => {
            if (d.originalSwing > 50) return ">50%"; // Show ">50%" for swings over 50%
            if (d.originalSwing < -50) return "<-50%"; // Show "<-50%" for swings below -50%
            return `${d.originalSwing.toFixed(1)}%`; // Show actual swing otherwise
        });
}

// Function to create the tooltip
export function createTooltip() {
    return d3.select("body")
        .append("div")
        .attr("class", "tooltip");
}

// Function to update the tooltip with state vote data
export function updateTooltip(tooltip, d, event) {
    const totalVotes = d.properties.Republican + d.properties.Democrat + d.properties.OtherVotes;
    const percentageRepublican = ((d.properties.Republican / totalVotes) * 100).toFixed(1) || 0;
    const percentageDemocrat = ((d.properties.Democrat / totalVotes) * 100).toFixed(1) || 0;
    const percentageOther = ((d.properties.OtherVotes / totalVotes) * 100).toFixed(1) || 0;

    tooltip.html(`
        <div class="tooltip-header">${d.properties.County}, ${d.properties.State}</div>
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
                    <td><span class="winner-republican">Republican</span></td>
                    <td>${d.properties.Republican.toLocaleString()}</td>
                    <td>${percentageRepublican}%</td>
                </tr>
                <tr>
                    <td><span class="winner-democrat">Democrat</span></td>
                    <td>${d.properties.Democrat.toLocaleString()}</td>
                    <td>${percentageDemocrat}%</td>
                </tr>
                <tr>
                    <td><span style="color: gray;">Other</span></td>
                    <td>${d.properties.OtherVotes.toLocaleString()}</td>
                    <td>${percentageOther}%</td>
                </tr>
            </tbody>
        </table>
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 20) + "px")
    .style("display", "block");
}

// Function to hide the tooltip
export function hideTooltip(tooltip) {
    tooltip.style("display", "none");
}

// Function to create the reset all button
export function createResetAllButton() {
    // Check if the button already exists
    let existingButton = d3.select("#reset-all");
    if (!existingButton.empty()) {
        return existingButton; // Return the existing button
    }

    // Create a new button if it doesn't exist
    return d3.select("#reset-all-container")
        .append("button")
        .attr("id", "reset-all")
        .text("Reset All Counties");
}