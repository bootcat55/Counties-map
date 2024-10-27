
import * as d3 from 'd3';
import { stateElectoralVotes } from './electoralVotes.js';

// Calculate electoral votes per state based on county data
export function calculateElectoralVotes(data) {
    let republicanVotes = 0;
    let democratVotes = 0;
    let tooCloseToCallVotes = 0;
    const states = Array.from(new Set(data.map(d => d.State)));

    states.forEach(state => {
        const stateVotes = data.filter(d => d.State === state);
        const stateTotalRepublican = d3.sum(stateVotes, d => d.Republican);
        const stateTotalDemocrat = d3.sum(stateVotes, d => d.Democrat);
        const stateTotalOther = d3.sum(stateVotes, d => d.OtherVotes);
        
        if (stateTotalRepublican > stateTotalDemocrat) {
            republicanVotes += stateElectoralVotes[state];
        } else if (stateTotalDemocrat > stateTotalRepublican) {
            democratVotes += stateElectoralVotes[state];
        } else {
            tooCloseToCallVotes += stateElectoralVotes[state];
        }
    });

    return { republicanVotes, democratVotes, tooCloseToCallVotes };
}

// Calculate popular vote totals by aggregating across all states
export function calculatePopularVote(data) {
    const stateVotes = d3.rollups(
        data,
        v => ({
            totalRepublican: d3.sum(v, d => +d.Republican),
            totalDemocrat: d3.sum(v, d => +d.Democrat),
            totalOther: d3.sum(v, d => +d.OtherVotes)
        }),
        d => d.State
    );

    let totalRepublicanVotes = 0, totalDemocratVotes = 0, totalOtherVotes = 0;
    stateVotes.forEach(([, votes]) => {
        totalRepublicanVotes += votes.totalRepublican;
        totalDemocratVotes += votes.totalOther;
        totalOtherVotes += votes.totalOther;
    });

    return { totalRepublicanVotes, totalDemocratVotes, totalOtherVotes };
}

// Calculate vote totals and percentages for a county
export function calculateCountyVotes(county) {
    county.vote_total = county.Republican + county.Democrat + county.OtherVotes;
    county.percentage_republican = county.vote_total ? (county.Republican / county.vote_total) * 100 : 0;
    county.percentage_democrat = county.vote_total ? (county.Democrat / county.vote_total) * 100 : 0;
    county.percentage_other = county.vote_total ? (county.OtherVotes / county.vote_total) * 100 : 0;
}

// Update vote totals and percentages for a county
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    county.Republican = newRepublicanVotes || 0;
    county.Democrat = newDemocratVotes || 0;
    county.OtherVotes = newOtherVotes || 0;

    calculateCountyVotes(county);

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
}

// Reset a county's vote totals to its original values
export function resetCountyVotes(county) {
    county.Republican = county.originalVotes.Republican;
    county.Democrat = county.originalVotes.Democrat;
    county.OtherVotes = county.originalVotes.OtherVotes;

    calculateCountyVotes(county);
}
