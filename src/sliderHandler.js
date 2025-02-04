import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray, resetCountyVotes, updateCountyColor, calculateCountyVotes } from './voteManager.js';
import { updateInfoPane } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    let previousSliderValues = { rep: 50, dem: 50, other: 0 }; // Initial percentages

    // Helper function to calculate and update slider percentages
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

    // Helper function to update the info pane with aggregated votes and population
    const updateInfoPaneWithTotalVotes = () => {
        if (selectedCounties.length === 0) {
            infoPane.style("display", "none");
            return;
        }

        const firstCounty = selectedCounties[0];
        const totalVotes = selectedCounties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        const totalPopulation = selectedCounties.reduce((sum, county) => sum + county.Population, 0);

        updateInfoPane(infoPane, {
            County: firstCounty.County,
            State: firstCounty.State,
            Republican: totalVotes.Republican,
            Democrat: totalVotes.Democrat,
            OtherVotes: totalVotes.OtherVotes,
            Population: totalPopulation,
        }, totalPopulation, "");
    };

    // Helper function to calculate new votes based on slider changes
    const calculateNewVotes = (county, repSwing, demSwing) => {
        const originalRep = county.originalRepublican || county.Republican;
        const originalDem = county.originalDemocrat || county.Democrat;
        const originalOther = county.originalOtherVotes || county.OtherVotes;
        const totalRepDemVotes = originalRep + originalDem;

        let newRep = originalRep + (repSwing / 100) * totalRepDemVotes;
        let newDem = originalDem + (demSwing / 100) * totalRepDemVotes;

        newRep = Math.max(0, newRep);
        newDem = Math.max(0, newDem);

        const totalAfterSwing = newRep + newDem;
        if (totalAfterSwing !== totalRepDemVotes) {
            const scaleFactor = totalRepDemVotes / totalAfterSwing;
            newRep *= scaleFactor;
            newDem *= scaleFactor;
        }

        if (repPercentage === 100) {
            newRep = totalRepDemVotes;
            newDem = 0;
        } else if (demPercentage === 100) {
            newRep = 0;
            newDem = totalRepDemVotes;
        }

        return {
            republican: Math.round(newRep),
            democrat: Math.round(newDem),
            other: originalOther,
        };
    };

    // Main function to handle slider input
    const handleSliderInput = () => {
        if (selectedCounties.length === 0) return;

        let repPercentage = +repSlider.property("value");
        let demPercentage = +demSlider.property("value");

        repPercentage = Math.max(0, Math.min(100, repPercentage));
        demPercentage = Math.max(0, Math.min(100, demPercentage));

        repSlider.property("value", repPercentage);
        demSlider.property("value", demPercentage);

        const repSwing = repPercentage - previousSliderValues.rep;
        const demSwing = demPercentage - previousSliderValues.dem;

        selectedCounties.forEach((county) => {
            const newVotes = calculateNewVotes(county, repSwing, demSwing);
            county.Republican = newVotes.republican;
            county.Democrat = newVotes.democrat;
            county.OtherVotes = newVotes.other;

            calculateCountyVotes(county);
            const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });

        previousSliderValues.rep = repPercentage;
        previousSliderValues.dem = demPercentage;

        recalculateAndDisplayPopularVote(countyDataArray);
        updateInfoPaneWithTotalVotes();
        updateSliderPercentages();
    };

    // Initialize sliders
    repSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    demSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    otherSlider.attr("max", 100).attr("step", 1).property("value", 0).style("cursor", "pointer");

    // Add event listeners
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

    // Initial updates
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