import * as d3 from 'd3';

// Function to update the vote totals of a clicked county
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes) {
    county.Republican = newRepublicanVotes;
    county.Democrat = newDemocratVotes;
    county.vote_total = county.Republican + county.Democrat;
    county.percentage_republican = (county.Republican / county.vote_total) * 100;
    county.percentage_democrat = (county.Democrat / county.vote_total) * 100;

    // Emit event to notify state map about vote update
    const event = new CustomEvent('countyVoteUpdated', {
        detail: {
            state: county.State,
            republicanVotes: county.Republican,
            democratVotes: county.Democrat,
            fips: county.FIPS  // Include FIPS code
        }
    });
    window.dispatchEvent(event);
}

// Function to update the map color based on the vote percentages
export function updateCountyColor(path, county) {
    if (county.percentage_republican > county.percentage_democrat) {
        path.attr("fill", d3.interpolateReds(county.percentage_republican / 100));
    } else {
        path.attr("fill", d3.interpolateBlues(county.percentage_democrat / 100));
    }
}

// Function to reset a county's votes and color to original values
export function resetCountyVotes(county) {
    county.Republican = county.originalVotes.Republican;
    county.Democrat = county.originalVotes.Democrat;
    county.vote_total = county.Republican + county.Democrat;
    county.percentage_republican = (county.Republican / county.vote_total) * 100;
    county.percentage_democrat = (county.Democrat / county.vote_total) * 100;
}
