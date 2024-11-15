import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray } from './voteManager.js';
import { updateCountyColor } from './voteManager.js';
import { updateInfoPane } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    const handleSliderInput = (changedSlider, aggregatedVotes, totalVotes, otherFixed) => {
        let repVotes = +repSlider.property('value');
        let demVotes = +demSlider.property('value');

        const remainingPool = totalVotes - otherFixed;

        if (changedSlider !== 'otherSlider') {
            const swingTotal = repVotes + demVotes;

            if (swingTotal !== remainingPool) {
                const swingDiff = remainingPool - swingTotal;

                if (changedSlider === 'repSlider') {
                    demVotes += swingDiff;
                } else if (changedSlider === 'demSlider') {
                    repVotes += swingDiff;
                }

                repVotes = Math.max(0, Math.min(remainingPool, repVotes));
                demVotes = Math.max(0, remainingPool - repVotes);
            }
        } else {
            otherFixed = +otherSlider.property('value');
        }

        repSlider.property('value', repVotes);
        demSlider.property('value', demVotes);

        const updateSliderPercentages = (repVotes, demVotes, otherVotes, totalVotes) => {
            const repPercentage = ((repVotes / totalVotes) * 100).toFixed(1) || 0;
            const demPercentage = ((demVotes / totalVotes) * 100).toFixed(1) || 0;
            const otherPercentage = ((otherVotes / totalVotes) * 100).toFixed(1) || 0;

            d3.select('#repPercentage').text(`(${repPercentage}%)`);
            d3.select('#demPercentage').text(`(${demPercentage}%)`);
            d3.select('#otherPercentage').text(`(${otherPercentage}%)`);
        };

        updateSliderPercentages(repVotes, demVotes, otherFixed, totalVotes);

        selectedCounties.forEach((county) => {
            const adjustedRepVotes = Math.round(
                county.Republican + ((repVotes - aggregatedVotes.Republican) * county.Republican) / remainingPool
            );
            const adjustedDemVotes = Math.round(
                county.Democrat + ((demVotes - aggregatedVotes.Democrat) * county.Democrat) / remainingPool
            );

            updateVoteTotals(county, adjustedRepVotes, adjustedDemVotes, county.OtherVotes);
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
