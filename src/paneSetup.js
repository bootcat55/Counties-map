// paneSetup.js
import * as d3 from 'd3';

export function createInfoPane() {
    // Create an information pane for county details (top-right)
    return d3.select("#info-container")
        .attr("class", "info-pane")
        .style("position", "absolute")
        .style("top", "20px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f9f9f9")
        .style("display", "none");
}

export function updateInfoPane(infoPane, county, stateTotalPopulation, winner, electoralVotes, countyType) {
    // Update the info pane content
    infoPane.html(`County: ${county.County}, ${county.State}<br>
                   Population: ${county.Population.toLocaleString()}<br>
                   State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
                   <strong>Winner: ${winner}</strong><br>
                   Vote Turnout: ${county.turnout.toFixed(2)}%<br>
                   Electoral Votes: ${electoralVotes}<br>
                   Type: ${countyType}`)
        .style("display", "block");
}

export function createUpdatePane() {
    // Create an update pane for inputting new vote totals (bottom-right)
    const updatePane = d3.select("#update-container")
        .attr("class", "update-pane")
        .style("position", "absolute")
        .style("bottom", "20px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f0f0f0")
        .style("display", "none");

    // Form fields for entering new votes
    const updateForm = updatePane.append("form");
    updateForm.append("label").text("New Republican Votes: ");
    const repInput = updateForm.append("input")
        .attr("type", "number")
        .attr("id", "republicanVotes");
    updateForm.append("br");
    updateForm.append("label").text("New Democrat Votes: ");
    const demInput = updateForm.append("input")
        .attr("type", "number")
        .attr("id", "democratVotes");
    updateForm.append("br");
    const submitButton = updateForm.append("button")
        .text("Update Votes");

    // Add the reset button to the update form (for a single county)
    const resetButton = updateForm.append("button")
        .text("Reset County")
        .style("margin-left", "10px");

    return { updatePane, repInput, demInput, submitButton, resetButton };
}

export function createTooltip() {
    // Create a tooltip div
    return d3.select("#tooltip-container")
        .attr("class", "tooltip")
        .style("display", "none");
}

export function updateTooltip(tooltip, d, event) {
    // Update the tooltip content and position
    tooltip.style("display", "block")
        .html(`County: ${d.properties.County}, ${d.properties.State}<br>
               <strong><span style="color: red;">Republican:</span></strong> ${d.properties.percentage_republican.toFixed(1)}%<br>
               <strong><span style="color: blue;">Democrat:</span></strong> ${d.properties.percentage_democrat.toFixed(1)}%<br>
               <strong>Percentage Difference:</strong> ${Math.abs(d.properties.percentage_republican - d.properties.percentage_democrat).toFixed(1)}%`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
}

export function hideTooltip(tooltip) {
    // Hide the tooltip
    tooltip.style("display", "none");
}

export function createResetAllButton() {
    // Create the reset all button
    return d3.select("body").append("button")
        .text("Reset All Counties")
        .style("position", "absolute")
        .style("top", "20px")
        .style("left", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f5f5f5");
}