import './styles.css';
import * as d3 from 'd3';
import { drawStackedBarChart } from './stackedBarChart.js';
import { calculateElectoralVotes, calculateCountyVotes } from './voteManager.js';  // Ensure calculateCountyVotes is imported
import { initializeMapInteractions } from './mapInteractions.js';
import { initializeCountyDataArray } from './voteManager.js';
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
            d.OtherVotes = +d['Other Votes'] || 0;
            d.Population = +d.Population || 0;

            calculateCountyVotes(d);

            // Exclude Bedford City from turnout calculation
            if (d.FIPS !== 51515) {
                d.turnout = (d.vote_total / d.Population) * 100 || 0;
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

        // Initialize countyDataArray with CSV data for further updates
        initializeCountyDataArray(data);

        callback(data);
    });
}

// Load the CSV data
readCsvFile('data/usacounty_votes.csv', data => {
    // Calculate electoral results including other votes in totals
    const electoralResults = calculateElectoralVotes(data);
    drawStackedBarChart(electoralResults);
    initializeMapInteractions();  // Initialize map interactions without passing data directly

    // Initial popular vote calculation and display using all counties in countyDataArray
    recalculateAndDisplayPopularVote(data);
});

export { readCsvFile };



