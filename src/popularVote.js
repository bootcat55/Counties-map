import * as d3 from 'd3';

// Constants
const TRANSFORM_OFFSET = 300;
const MARGIN_RIGHT = 20;
const MARGIN_LEFT = 100;
const PERCENTAGE_FACTOR = 100;

// Calculate total Democrat, Republican, and Other votes across all counties
export function calculatePopularVote(countyData) {
    const totalRepublicanVotes = d3.sum(countyData, countyData => countyData.Republican);
    const totalDemocratVotes = d3.sum(countyData, countyData => countyData.Democrat);
    const totalOtherVotes = d3.sum(countyData, countyData => countyData.OtherVotes);

    return { totalRepublicanVotes, totalDemocratVotes, totalOtherVotes };
}

// Helper function to create and style the vote display container
const createVoteDisplay = () => {
    return d3.select("#popular-vote-container")
        .html("")
        .style("display", "flex")
        .style("justify-content", "left")
        .style("margin-top", "-50px");
};

// Helper function to append vote information to the container
const appendVoteInfo = (container, className, label, votes, percentage, marginLeft = 0) => {
    container.append("div")
        .attr("class", className)
        .style("margin-right", marginLeft === 0 ? MARGIN_RIGHT : 0)
        .style("margin-left", marginLeft)
        .style("transform", `translateX(${TRANSFORM_OFFSET}px)`)
        .html(`
            <strong>${label} Total Votes:</strong> ${votes.toLocaleString()}
            <br><strong>(${percentage}% of total)</strong>
        `);
};

// Display popular vote totals with percentages in the UI for all counties
export function displayPopularVote(popularVoteResults) {
    const totalVotes = popularVoteResults.totalRepublicanVotes + popularVoteResults.totalDemocratVotes + popularVoteResults.totalOtherVotes;
    const democratPercentage = ((popularVoteResults.totalDemocratVotes / totalVotes) * PERCENTAGE_FACTOR).toFixed(1);
    const republicanPercentage = ((popularVoteResults.totalRepublicanVotes / totalVotes) * PERCENTAGE_FACTOR).toFixed(1);
    const otherPercentage = ((popularVoteResults.totalOtherVotes / totalVotes) * PERCENTAGE_FACTOR).toFixed(1);

    const container = createVoteDisplay();

    appendVoteInfo(container, "popular-vote-democrat", "Democrat", popularVoteResults.totalDemocratVotes, democratPercentage);
    appendVoteInfo(container, "popular-vote-republican", "Republican", popularVoteResults.totalRepublicanVotes, republicanPercentage, MARGIN_LEFT);
    appendVoteInfo(container, "popular-vote-other", "Other", popularVoteResults.totalOtherVotes, otherPercentage, MARGIN_LEFT);
}

// Recalculate and display popular vote totals for each county in the dataset
export function recalculateAndDisplayPopularVote(countyData) {
    const popularVoteResults = calculatePopularVote(countyData);
    displayPopularVote(popularVoteResults);
}