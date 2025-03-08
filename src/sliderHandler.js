import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray, resetCountyVotes, updateCountyColor, calculateCountyVotes } from './voteManager.js';
import { updateInfoPane, updateBarChart } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    // Function to update slider percentages
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

    // Function to update the info pane with total votes
    const updateInfoPaneWithTotalVotes = () => {
        if (selectedCounties.length === 0) {
            infoPane.style("display", "none");
            return;
        }

        const firstCounty = selectedCounties[0];

        // Calculate the total population of all counties in the same state as the first county
        const stateTotalPopulation = countyDataArray
            .filter(county => county.State === firstCounty.State)
            .reduce((sum, county) => sum + county.Population, 0);

        // Aggregate votes for selected counties
        const totalVotes = selectedCounties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        // Update the info pane with aggregated data
        updateInfoPane(infoPane, {
            counties: selectedCounties,
            aggregatedVotes: totalVotes,
            totalVotes: totalVotes.Republican + totalVotes.Democrat + totalVotes.OtherVotes,
            stateTotalPopulation,
            countyType: firstCounty.vote_total > 50000 ? "Urban" : "Rural",
        });

        // Update the bar chart with the new data
        updateBarChart({
            republicanVotes: totalVotes.Republican,
            democratVotes: totalVotes.Democrat,
            otherVotes: totalVotes.OtherVotes
        });
    };

    // Track previous slider values
    let previousSliderValues = { rep: 50, dem: 50, other: 0 };

    // Function to handle slider input
    const handleSliderInput = () => {
        let repPercentage = +repSlider.property("value");
        let demPercentage = +demSlider.property("value");

        // Ensure the sliders' values are within bounds (0 to 100)
        repPercentage = Math.max(0, Math.min(100, repPercentage));
        demPercentage = Math.max(0, Math.min(100, demPercentage));

        // Update the sliders with the constrained values
        repSlider.property("value", repPercentage);
        demSlider.property("value", demPercentage);

        // Calculate the swing percentage based on the Republican and Democrat sliders
        const repSwing = repPercentage - previousSliderValues.rep;
        const demSwing = demPercentage - previousSliderValues.dem;

        // Apply the swing to each selected county relative to its original vote distribution
        selectedCounties.forEach((county) => {
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

            county.Republican = Math.round(newRep);
            county.Democrat = Math.round(newDem);
            county.OtherVotes = originalOther;

            calculateCountyVotes(county);
            updateVoteTotals(county, county.Republican, county.Democrat, county.OtherVotes);

            const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });

        // Update the previous slider values
        previousSliderValues.rep = repPercentage;
        previousSliderValues.dem = demPercentage;

        // Recalculate and display the popular vote
        recalculateAndDisplayPopularVote(countyDataArray);

        // Update the info pane and slider percentages
        updateInfoPaneWithTotalVotes();
        updateSliderPercentages();
    };

    // Initialize sliders
    repSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    demSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    otherSlider.attr("max", 100).attr("step", 1).property("value", 0).style("cursor", "pointer");

    // Add event listeners to sliders
    repSlider.on("input", () => handleSliderInput());
    demSlider.on("input", () => handleSliderInput());
    otherSlider.on("input", () => handleSliderInput());

    // Add event listeners to buttons
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

        // Update the bar chart
        updateBarChart({
            republicanVotes: 0,
            democratVotes: 0,
            otherVotes: 0
        });
    });

    // Update the UI initially
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