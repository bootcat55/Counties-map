import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray, resetCountyVotes, updateCountyColor, calculateCountyVotes } from './voteManager.js';
import { updateInfoPane } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    const updateSliderPercentages = () => {
        const totalVotes = selectedCounties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        const total = totalVotes.Republican + totalVotes.Democrat + totalVotes.OtherVotes;
        const repPercentage = ((totalVotes.Republican / total) * 100).toFixed(2) || 0;
        const demPercentage = ((totalVotes.Democrat / total) * 100).toFixed(2) || 0;
        const otherPercentage = ((totalVotes.OtherVotes / total) * 100).toFixed(2) || 0;

        d3.select("#repPercentage").text(`(${repPercentage}%)`);
        d3.select("#demPercentage").text(`(${demPercentage}%)`);
        d3.select("#otherPercentage").text(`(${otherPercentage}%)`);

        repSlider.property("value", Math.round(repPercentage));
        demSlider.property("value", Math.round(demPercentage));
        otherSlider.property("value", Math.round(otherPercentage));
    };

    const calculateSwing = (newPercentage, originalPercentage) => newPercentage - originalPercentage;

    const applySwingToCounty = (county, swingPercentage) => {
        const totalVotes = county.Republican + county.Democrat + county.OtherVotes;
        county.Republican = Math.max(0, Math.round(county.Republican * (1 + swingPercentage / 100)));
        county.Democrat = Math.max(0, Math.round(county.Democrat * (1 - swingPercentage / 100)));
        county.OtherVotes = Math.max(0, totalVotes - county.Republican - county.Democrat);
        calculateCountyVotes(county);
    };

    const updateInfoPaneWithTotalVotes = () => {
        const totalVotes = selectedCounties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        const totalPopulation = selectedCounties.reduce((sum, county) => sum + county.Population, 0);

        updateInfoPane(infoPane, {
            County: "Selected Counties",
            State: "",
            Republican: totalVotes.Republican,
            Democrat: totalVotes.Democrat,
            OtherVotes: totalVotes.OtherVotes,
            Population: totalPopulation,
        }, totalPopulation, "");
    };

    let previousSliderValues = { rep: 50, dem: 50, other: 0 }; // Initial percentages

    const handleSliderInput = () => {
        let repPercentage = +repSlider.property("value");
        let demPercentage = +demSlider.property("value");
        let otherPercentage = +otherSlider.property("value");
    
        // Ensure the sliders' values are within bounds (0 to 100)
        repPercentage = Math.max(0, Math.min(100, repPercentage));
        demPercentage = Math.max(0, Math.min(100, demPercentage));
        otherPercentage = Math.max(0, Math.min(100, otherPercentage));
    
        // Update the sliders with the constrained values
        repSlider.property("value", repPercentage);
        demSlider.property("value", demPercentage);
        otherSlider.property("value", otherPercentage);
    
        // Calculate the swing percentage based on the Republican slider
        const repSwing = repPercentage - previousSliderValues.rep;
        const demSwing = demPercentage - previousSliderValues.dem;
        const otherSwing = otherPercentage - previousSliderValues.other;
    
        // Apply the swing to each selected county relative to its original vote distribution
        selectedCounties.forEach((county) => {
            // Retrieve the county's original vote distribution
            const originalRep = county.originalRepublican || county.Republican;
            const originalDem = county.originalDemocrat || county.Democrat;
            const originalOther = county.originalOtherVotes || county.OtherVotes;
    
            // Calculate the new vote distribution based on the swing
            county.Republican = Math.max(0, Math.round(originalRep + (repSwing / 100) * (originalRep + originalDem + originalOther)));
            county.Democrat = Math.max(0, Math.round(originalDem + (demSwing / 100) * (originalRep + originalDem + originalOther)));
            county.OtherVotes = Math.max(0, Math.round(originalOther + (otherSwing / 100) * (originalRep + originalDem + originalOther)));
    
            // Ensure the county's votes are consistent
            calculateCountyVotes(county);
    
            // Update the county's color on the map
            const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });
    
        // Update the previous slider values
        previousSliderValues.rep = repPercentage;
        previousSliderValues.dem = demPercentage;
        previousSliderValues.other = otherPercentage;
    
        // Recalculate and display the popular vote
        recalculateAndDisplayPopularVote(countyDataArray);
    
        // Update the info pane and slider percentages
        updateInfoPaneWithTotalVotes();
        updateSliderPercentages();
    };

    repSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    demSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    otherSlider.attr("max", 100).attr("step", 1).property("value", 0).style("cursor", "pointer");

    repSlider.on("input", () => handleSliderInput());
    demSlider.on("input", () => handleSliderInput());
    otherSlider.on("input", () => handleSliderInput());

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

    updateSliderPercentages();
    updateInfoPaneWithTotalVotes();
}

export function resetAllSliders(sliders, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;

    repSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    demSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    otherSlider.attr("max", 100).attr("step", 1).property("value", 0).style("cursor", "pointer");

    const total = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
    const repPercentage = ((aggregatedVotes.Republican / total) * 100).toFixed(2) || 0;
    const demPercentage = ((aggregatedVotes.Democrat / total) * 100).toFixed(2) || 0;
    const otherPercentage = ((aggregatedVotes.OtherVotes / total) * 100).toFixed(2) || 0;

    d3.select("#repPercentage").text(`(${repPercentage}%)`);
    d3.select("#demPercentage").text(`(${demPercentage}%)`);
    d3.select("#otherPercentage").text(`(${otherPercentage}%)`);
}
