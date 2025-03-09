import './styles.css';
import * as d3 from 'd3';
import { drawStackedBarChart } from './stackedBarChart.js';
import { calculateElectoralVotes, initializeCountyDataArray, updateStateVotes } from './voteManager.js';
import { initializeMapInteractions } from './mapInteractions.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import './statemap.js';

function readCsvFile(url, callback) {
    d3.csv(url).then(data => {
        data.forEach(d => {
            d.FIPS = +d.FIPS;
            d.County = d.County?.trim() || 'Unknown';
            d.State = d.State?.trim() || 'Unknown';
            d.Republican = +d.Republican || 0;
            d.Democrat = +d.Democrat || 0;
            d.OtherVotes = +d['Other Votes'] || 0;
            d.vote_total = d.Republican + d.Democrat + d.OtherVotes;
            d.Population = +d.Population || 0;

            // Calculate percentages and turnout
            if (d.vote_total > 0) {
                d.percentage_republican = (d.Republican / d.vote_total) * 100 || 0;
                d.percentage_democrat = (d.Democrat / d.vote_total) * 100 || 0;
            } else {
                d.percentage_republican = 0;
                d.percentage_democrat = 0;
            }
            d.turnout = (d.vote_total / d.Population) * 100 || 0;

            d.originalVotes = {
                Republican: d.Republican,
                Democrat: d.Democrat,
                OtherVotes: d.OtherVotes,
            };
        });

        // Save data to global array
        initializeCountyDataArray(data);
        callback(data);
    });
}

// Centralized data initialization
readCsvFile('data/2024county_votes.csv', data => {
    const electoralResults = calculateElectoralVotes(data);
    drawStackedBarChart(electoralResults);
    initializeMapInteractions(); // Initialize interactions with global countyDataArray
    recalculateAndDisplayPopularVote(data); // Populate initial popular vote
});

export { readCsvFile };