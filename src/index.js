import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js'; // Import the stacked bar chart function
import { stateElectoralVotes, calculateElectoralVotes } from './electoralVotes.js'; // Import the electoral votes dataset
import { updateVoteTotals, updateCountyColor, resetCountyVotes } from './voteUpdates.js'; // Import the vote update functions
import { initializeMapInteractions } from './mapInteractions.js'; // Import the map interaction logic
import './statemap.js';

// Function to read the CSV file
function readCsvFile(url, callback) {
    d3.csv(url).then(data => {
        data.forEach(d => {
            d.FIPS = +d.FIPS;
            d.County = d.County ? d.County.trim() : 'Unknown'; 
            d.State = d.State ? d.State.trim() : 'Unknown';  
            d.Republican = +d.Republican || 0;
            d.Democrat = +d.Democrat || 0;
            d.Population = +d.Population || 0;
            d.vote_total = d.Republican + d.Democrat;
            d.percentage_republican = (d.Republican / d.vote_total) * 100 || 0;
            d.percentage_democrat = (d.Democrat / d.vote_total) * 100 || 0;
            d.turnout = ((d.Population - d.vote_total) / d.Population) * 100 || 0;

            d.originalVotes = {
                Republican: d.Republican,
                Democrat: d.Democrat
            };
        });
        callback(data);
    });
}

// Load the CSV data
readCsvFile('data/usacounty_votes.csv', data => {
    const electoralResults = calculateElectoralVotes(data);
    drawStackedBarChart(electoralResults);
    initializeMapInteractions(data); // Initialize map interactions with the data
});


