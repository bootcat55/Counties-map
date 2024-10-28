import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js';
import { calculateElectoralVotes } from './voteLogic.js';
import { updateVoteTotals, resetCountyVotes, calculateCountyVotes } from './voteLogic.js';
import { initializeMapInteractions } from './mapInteractions.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import './statemap.js';

function readCsvFile(url, callback) {
    d3.csv(url).then(data => {
        data.forEach(d => {
            d.FIPS = +d.FIPS;
            d.County = d.County ? d.County.trim() : 'Unknown';
            d.State = d.State ? d.State.trim() : 'Unknown';
            d.Republican = +d.Republican || 0;
            d.Democrat = +d.Democrat || 0;
            d.OtherVotes = +d['Other Votes'] || 0;  // Map 'Other Votes' column to OtherVotes
            d.Population = +d.Population || 0;

            // Calculate vote totals and percentages
            calculateCountyVotes(d);

            // Exclude Bedford City from turnout calculation
            if (d.FIPS !== 51515) {
                d.turnout = ((d.Population - d.vote_total) / d.Population) * 100 || 0;
                d.originalVotes = {
                    Republican: d.Republican,
                    Democrat: d.Democrat,
                    OtherVotes: d.OtherVotes
                };
            } else {
                d.turnout = 0;
                d.Population = 0;
            }
        });

        callback(data);
    });
}

// Load the CSV data
readCsvFile('data/usacounty_votes.csv', data => {
    // Calculate electoral results including other votes in totals
    const electoralResults = calculateElectoralVotes(data);
    drawStackedBarChart(electoralResults);
    initializeMapInteractions(data);  // Initialize map interactions with the data

    // Initial popular vote calculation and display
    recalculateAndDisplayPopularVote(data);
});

export { readCsvFile };

