import * as d3 from 'd3';
import { calculateCountyVotes } from './voteLogic.js'; // Centralized calculation function
import { voteMap, stateColorToggle } from './statemap.js'; 
import { calculatePopularVote, displayPopularVote } from './popularVote.js';

// Function to update a county’s votes and map color
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    // Update the county's vote properties
    county.Republican = newRepublicanVotes || 0;
    county.Democrat = newDemocratVotes || 0;
    county.OtherVotes = newOtherVotes || 0;

    // Recalculate totals and percentages
    calculateCountyVotes(county);

    // Emit event to notify the state map
    const event = new CustomEvent('countyVoteUpdated', {
        detail: {
            state: county.State,
            republicanVotes: county.Republican,
            democratVotes: county.Democrat,
            otherVotes: county.OtherVotes,
            fips: county.FIPS
        }
    });
    window.dispatchEvent(event);

    // Remove any manual override if state majority is clear
    const stateVotes = voteMap.get(county.State);
    if (stateVotes && stateVotes.totalRepublican !== stateVotes.totalDemocrat) {
        stateColorToggle.delete(county.State);
    }

    // Recalculate and display popular votes
    recalculateAndDisplayPopularVote();
    window.dispatchEvent(new Event('stateColorChangedByVotes'));
}

// Update the color of a county based on the latest percentages
export function updateCountyColor(path, county) {
    if (county.percentage_republican > county.percentage_democrat) {
        path.attr("fill", d3.interpolateReds(county.percentage_republican / 100));
    } else if (county.percentage_democrat > county.percentage_republican) {
        path.attr("fill", d3.interpolateBlues(county.percentage_democrat / 100));
    } else {
        path.attr("fill", county.vote_total === 0 ? "#ccc" : "purple");
    }
}

// Reset a county’s votes and update color
export function resetCountyVotes(county) {
    county.Republican = county.originalVotes.Republican;
    county.Democrat = county.originalVotes.Democrat;
    county.OtherVotes = county.originalVotes.OtherVotes;

    calculateCountyVotes(county);
    recalculateAndDisplayPopularVote();
}

// Recalculate and display popular vote totals
function recalculateAndDisplayPopularVote() {
    d3.csv('data/usacounty_votes.csv').then(data => {
        data.forEach(d => {
            d.Republican = +d.Republican;
            d.Democrat = +d.Democrat;
            d.OtherVotes = +d['Other Votes'];
        });

        const popularVoteResults = calculatePopularVote(data);
        displayPopularVote(popularVoteResults);
    });
}
