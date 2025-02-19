import * as d3 from 'd3';

// Function to create the info pane
export function createInfoPane() {
    return d3.select("#info-container")
        .attr("class", "info-pane")
        .style("position", "absolute")
        .style("top", "700px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f9f9f9")
        .style("display", "none");
}

export function updateInfoPane(infoPane, counties, stateTotalPopulation, countyType, aggregatedVotes = null, totalVotes = null) {
    let republicanVotes, democratVotes, otherVotes, percentageRepublican, percentageDemocrat, percentageOther;

    // Ensure counties is always an array
    const countiesArray = Array.isArray(counties) ? counties : [counties];

    // Calculate total population and total votes across all selected counties
    const totalPopulation = countiesArray.reduce((sum, county) => sum + (county.Population || 0), 0);
    const totalVotesAcrossCounties = countiesArray.reduce((sum, county) => sum + (county.Republican || 0) + (county.Democrat || 0) + (county.OtherVotes || 0), 0);

    // Calculate turnout based on the total population and total votes
    const turnout = totalPopulation > 0 ? ((totalVotesAcrossCounties / totalPopulation) * 100).toFixed(1) : "0.0";

    if (aggregatedVotes && totalVotes) {
        republicanVotes = aggregatedVotes.Republican;
        democratVotes = aggregatedVotes.Democrat;
        otherVotes = aggregatedVotes.OtherVotes;

        percentageRepublican = ((republicanVotes / totalVotes) * 100).toFixed(1) || 0;
        percentageDemocrat = ((democratVotes / totalVotes) * 100).toFixed(1) || 0;
        percentageOther = ((otherVotes / totalVotes) * 100).toFixed(1) || 0;
    } else {
        // Calculate votes and percentages based on the selected counties
        republicanVotes = countiesArray.reduce((sum, county) => sum + (county.Republican || 0), 0);
        democratVotes = countiesArray.reduce((sum, county) => sum + (county.Democrat || 0), 0);
        otherVotes = countiesArray.reduce((sum, county) => sum + (county.OtherVotes || 0), 0);

        const totalVotes = republicanVotes + democratVotes + otherVotes;
        percentageRepublican = totalVotes > 0 ? ((republicanVotes / totalVotes) * 100).toFixed(1) : "0.0";
        percentageDemocrat = totalVotes > 0 ? ((democratVotes / totalVotes) * 100).toFixed(1) : "0.0";
        percentageOther = totalVotes > 0 ? ((otherVotes / totalVotes) * 100).toFixed(1) : "0.0";
    }

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
                    <td>Vote Turnout</td>
                    <td>${turnout}%</td>
                </tr>
                <tr>
                    <td>Type</td>
                    <td>${countyType}</td>
                </tr>
                <tr>
                    <td><span style="color: red;">Republican Votes</span></td>
                    <td>${republicanVotes.toLocaleString()} (${percentageRepublican}%)</td>
                </tr>
                <tr>
                    <td><span style="color: blue;">Democrat Votes</span></td>
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
        .attr("class", "update-pane")
        .style("position", "absolute")
        .style("bottom", "-600px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f0f0f0")
        .style("display", "none");

    const updateForm = updatePane.append("form")
        .style("display", "flex")
        .style("flex-direction", "column");

    updateForm.append("div").attr("id", "voting-info").style("margin-bottom", "10px");

    const createSlider = (labelText, id, percentageId, color) => {
        updateForm.append("label")
            .html(`<span style="font-weight: bold; color: ${color};">${labelText}</span> <span id="${percentageId}">(0%)</span>`);
        return updateForm.append("input")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 100)
            .attr("value", 33)
            .attr("id", id)
            .style("width", "100%")
            .style("margin", "5px 0");
    };

    const repSlider = createSlider("Republican:", "repSlider", "repPercentage", "red");
    const demSlider = createSlider("Democrat:", "demSlider", "demPercentage", "blue");
    const otherSlider = createSlider("Other:", "otherSlider", "otherPercentage", "purple");

    const submitButton = updateForm.append("button").text("Update Votes");
    const resetButton = updateForm.append("button").text("Reset County").style("margin-top", "10px");

    return { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton };
}

// Function to create the tooltip
export function createTooltip() {
    return d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("box-shadow", "0 2px 4px rgba(0, 0, 0, 0.1)")
        .style("font-family", "Arial, sans-serif")
        .style("font-size", "14px")
        .style("color", "#333")
        .style("pointer-events", "none")
        .style("display", "none");
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
                    <td><span style="color: red;">Republican</span></td>
                    <td>${d.properties.Republican.toLocaleString()}</td>
                    <td>${percentageRepublican}%</td>
                </tr>
                <tr>
                    <td><span style="color: blue;">Democrat</span></td>
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
        .text("Reset All Counties")
        .style("margin-top", "10px");
}

