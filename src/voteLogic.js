import * as d3 from 'd3';
import { stateElectoralVotes } from './electoralVotes.js';
import { calculatePopularVote, displayPopularVote } from './popularVote.js';

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

// Calculate vote totals and percentages for a county
export function calculateCountyVotes(county) {
    county.vote_total = county.Republican + county.Democrat + county.OtherVotes;
    county.percentage_republican = county.vote_total ? (county.Republican / county.vote_total) * 100 : 0;
    county.percentage_democrat = county.vote_total ? (county.Democrat / county.vote_total) * 100 : 0;
    county.percentage_other = county.vote_total ? (county.OtherVotes / county.vote_total) * 100 : 0;
}

