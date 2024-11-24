import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray, resetCountyVotes, updateCountyColor, calculateCountyVotes } from './voteManager.js';
import { updateInfoPane } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    const updateSliderPercentages = (repVotes, demVotes, otherVotes) => {
        const total = repVotes + demVotes + otherVotes;
        const repPercentage = ((repVotes / total) * 100).toFixed(1) || 0;
        const demPercentage = ((demVotes / total) * 100).toFixed(1) || 0;
        const otherPercentage = ((otherVotes / total) * 100).toFixed(1) || 0;

        d3.select("#repPercentage").text(`(${repPercentage}%)`);
        d3.select("#demPercentage").text(`(${demPercentage}%)`);
        d3.select("#otherPercentage").text(`(${otherPercentage}%)`);
    };

    let previousSliderValues = { rep: 50, dem: 50, other: 0 }; // Initial percentages

    const handleSliderInput = (changedSlider) => {
        // Retrieve current slider values
        let repVotes = +repSlider.property("value");
        let demVotes = +demSlider.property("value");
        let otherVotes = +otherSlider.property("value");
    
        // Calculate total slider votes
        const totalSliderVotes = repVotes + demVotes + otherVotes;
    
        // Normalize slider percentages
        const currentRepPercentage = (repVotes / totalSliderVotes) * 100;
        const currentDemPercentage = (demVotes / totalSliderVotes) * 100;
        const currentOtherPercentage = (otherVotes / totalSliderVotes) * 100;
    
        // Determine swing adjustment
        const repSwing = currentRepPercentage - previousSliderValues.rep;
        const demSwing = currentDemPercentage - previousSliderValues.dem;
        const otherSwing = currentOtherPercentage - previousSliderValues.other;
    
        // Adjust votes dynamically for each selected county
        selectedCounties.forEach((county) => {
            const originalTotalVotes = county.Republican + county.Democrat + county.OtherVotes;
    
            // Apply swing to Republican votes
            county.Republican = Math.round(county.Republican + (repSwing / 100) * originalTotalVotes);
    
            // Apply swing to Democrat votes
            county.Democrat = Math.round(county.Democrat + (demSwing / 100) * originalTotalVotes);
    
            // Adjust "Other Votes" to maintain total consistency
            county.OtherVotes = Math.max(
                0,
                originalTotalVotes - county.Republican - county.Democrat
            );
    
            // Recalculate percentages for this county
            calculateCountyVotes(county);
    
            // Update the county's color on the map
            const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });
    
        // Update previous slider values
        previousSliderValues = {
            rep: currentRepPercentage,
            dem: currentDemPercentage,
            other: currentOtherPercentage,
        };
    
        // Recalculate and update popular vote totals across all counties
        recalculateAndDisplayPopularVote(countyDataArray);
    
        // Update the info pane with the first selected county
        const firstCounty = selectedCounties[0];
        if (firstCounty) {
            updateInfoPane(infoPane, {
                ...firstCounty,
                Republican: firstCounty.Republican,
                Democrat: firstCounty.Democrat,
                OtherVotes: firstCounty.OtherVotes,
            }, firstCounty.Population, firstCounty.vote_total > 50000 ? "Urban" : "Rural");
        }
    
        // Update slider percentages display
        updateSliderPercentages(
            Math.round(currentRepPercentage),
            Math.round(currentDemPercentage),
            Math.round(currentOtherPercentage)
        );
    };
    
    // Attach dynamic handlers to sliders
    repSlider.on("input", () => handleSliderInput("repSlider"));
    demSlider.on("input", () => handleSliderInput("demSlider"));
    otherSlider.on("input", () => handleSliderInput("otherSlider"));
    
    submitButton.on("click", (e) => {
        e.preventDefault();
        updatePane.style("display", "none");
    });

    resetButton.on("click", (e) => {
        e.preventDefault();
        selectedCounties.forEach((county) => {
            resetCountyVotes(county);
            const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });
        selectedCounties.length = 0;
        updatePane.style("display", "none");
        recalculateAndDisplayPopularVote(countyDataArray);
    });

    repSlider.attr("max", totalVotes).property("value", aggregatedVotes.Republican);
    demSlider.attr("max", totalVotes).property("value", aggregatedVotes.Democrat);
    otherSlider.attr("max", totalVotes).property("value", aggregatedVotes.OtherVotes);

    updateSliderPercentages(aggregatedVotes.Republican, aggregatedVotes.Democrat, aggregatedVotes.OtherVotes);
}
