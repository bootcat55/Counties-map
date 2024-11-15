import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray, resetCountyVotes } from './voteManager.js';
import { updateCountyColor } from './voteManager.js';
import { updateInfoPane } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    const handleSliderInput = (changedSlider) => {
        let repVotes = +repSlider.property('value');
        let demVotes = +demSlider.property('value');
        const otherFixed = +otherSlider.property('value');
        const remainingPool = totalVotes - otherFixed;

        if (changedSlider !== 'otherSlider') {
            const swingDiff = remainingPool - (repVotes + demVotes);
            if (changedSlider === 'repSlider') demVotes += swingDiff;
            else if (changedSlider === 'demSlider') repVotes += swingDiff;

            repVotes = Math.max(0, Math.min(remainingPool, repVotes));
            demVotes = Math.max(0, remainingPool - repVotes);
        }

        repSlider.property('value', repVotes);
        demSlider.property('value', demVotes);

        const updateSliderPercentages = (repVotes, demVotes, otherVotes, totalVotes) => {
            d3.select('#repPercentage').text(`(${((repVotes / totalVotes) * 100).toFixed(1)}%)`);
            d3.select('#demPercentage').text(`(${((demVotes / totalVotes) * 100).toFixed(1)}%)`);
            d3.select('#otherPercentage').text(`(${((otherVotes / totalVotes) * 100).toFixed(1)}%)`);
        };

        updateSliderPercentages(repVotes, demVotes, otherFixed, totalVotes);

        selectedCounties.forEach((county) => {
            updateVoteTotals(county, repVotes, demVotes, otherFixed);
            const countyPath = svg.selectAll('path.map-layer').filter((f) => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });

        recalculateAndDisplayPopularVote(countyDataArray);
    };

    repSlider.on('input', () => handleSliderInput('repSlider'));
    demSlider.on('input', () => handleSliderInput('demSlider'));
    otherSlider.on('input', () => handleSliderInput('otherSlider'));

    submitButton.on('click', (e) => {
        e.preventDefault();
        updatePane.style('display', 'none');
    });

    resetButton.on('click', (e) => {
        e.preventDefault();
        selectedCounties.forEach((county) => {
            resetCountyVotes(county);
            const countyPath = svg.selectAll('path.map-layer').filter((f) => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });
        selectedCounties.length = 0;
        updatePane.style('display', 'none');
        recalculateAndDisplayPopularVote(countyDataArray);
    });
}
