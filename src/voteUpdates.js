import * as d3 from 'd3';
import { calculatePopularVote, displayPopularVote } from './popularVote.js';
import { voteMap, stateColorToggle } from './statemap.js'; // Import stateColorToggle and voteMap

// Function to update the vote totals of a clicked county
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    // Update the county's vote properties with new values, defaulting to 0 if any are undefined
    county.Republican = newRepublicanVotes || 0;
    county.Democrat = newDemocratVotes || 0;
    county.OtherVotes = newOtherVotes || 0;

    // Recalculate the total and percentages
    county.vote_total = county.Republican + county.Democrat + county.OtherVotes;
    county.percentage_republican = county.vote_total ? (county.Republican / county.vote_total) * 100 : 0;
    county.percentage_democrat = county.vote_total ? (county.Democrat / county.vote_total) * 100 : 0;
    county.percentage_other = county.vote_total ? (county.OtherVotes / county.vote_total) * 100 : 0;

    // Emit event to notify the state map about the update
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

    // Check if this county update results in a definitive color for the state
    const state = county.State;
    const stateVotes = voteMap.get(state);
    if (stateVotes && stateVotes.totalRepublican !== stateVotes.totalDemocrat) {
        // Remove override if the state now has a clear majority based on votes
        stateColorToggle.delete(state);
    }

    // Recalculate and display popular vote totals
    recalculateAndDisplayPopularVote();

    // Dispatch an event to update the stacked bar chart with vote-based color changes
    const chartUpdateEvent = new Event('stateColorChangedByVotes');
    window.dispatchEvent(chartUpdateEvent);
}

// Function to update the map color based on the vote percentages
export function updateCountyColor(path, county) {
    if (county.percentage_republican > county.percentage_democrat) {
        path.attr("fill", d3.interpolateReds(county.percentage_republican / 100));
    } else if (county.percentage_democrat > county.percentage_republican) {
        path.attr("fill", d3.interpolateBlues(county.percentage_democrat / 100));
    } else {
        path.attr("fill", county.vote_total === 0 ? "#ccc" : "purple");  // Gray if zero votes, purple if a tie
    }
}

// Function to reset a county's votes and color to original values
export function resetCountyVotes(county) {
    county.Republican = county.originalVotes.Republican;
    county.Democrat = county.originalVotes.Democrat;
    county.OtherVotes = county.originalVotes.OtherVotes;
    county.vote_total = county.Republican + county.Democrat + county.OtherVotes;
    county.percentage_republican = county.vote_total ? (county.Republican / county.vote_total) * 100 : 0;
    county.percentage_democrat = county.vote_total ? (county.Democrat / county.vote_total) * 100 : 0;
    county.percentage_other = county.vote_total ? (county.OtherVotes / county.vote_total) * 100 : 0;

    // Recalculate and display popular vote totals after reset
    recalculateAndDisplayPopularVote();
}

// Helper function to recalculate and display the popular vote
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