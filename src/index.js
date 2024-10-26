import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js'; // Import the stacked bar chart function
import { stateElectoralVotes, calculateElectoralVotes } from './electoralVotes.js'; // Import the electoral votes dataset
import { updateVoteTotals, updateCountyColor, resetCountyVotes } from './voteUpdates.js'; // Import the vote update functions
import { initializeMapInteractions } from './mapInteractions.js'; // Import the map interaction logic
import './statemap.js';

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

            // Exclude Bedford City from turnout calculation
            if (d.FIPS !== 51515) {
                d.turnout = ((d.Population - d.vote_total) / d.Population) * 100 || 0;
                d.originalVotes = {
                    Republican: d.Republican,
                    Democrat: d.Democrat
                };
            } else {
                d.turnout = 0; // Assign zero turnout to Bedford City
                d.Population = 0; // Exclude Bedford City’s population in other calculations
            }
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


