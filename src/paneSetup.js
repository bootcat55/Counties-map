import * as d3 from 'd3';

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
}

// Function to create the update pane with sliders
export function createUpdatePane() {
    const updatePane = d3.select("#update-container")
        .attr("class", "update-pane");

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