import * as d3 from 'd3';

// Calculate total Democrat, Republican, and Other votes across all counties
export function calculatePopularVote(countyData) {
    const totalRepublicanVotes = d3.sum(countyData, d => d.Republican);
    const totalDemocratVotes = d3.sum(countyData, d => d.Democrat);
    const totalOtherVotes = d3.sum(countyData, d => d.OtherVotes);

    return { totalRepublicanVotes, totalDemocratVotes, totalOtherVotes };
}

// Display popular vote totals with percentages in the UI for all counties
export function displayPopularVote(popularVoteResults) {
    const totalVotes = popularVoteResults.totalRepublicanVotes + popularVoteResults.totalDemocratVotes + popularVoteResults.totalOtherVotes;
    const democratPercentage = ((popularVoteResults.totalDemocratVotes / totalVotes) * 100).toFixed(1);
    const republicanPercentage = ((popularVoteResults.totalRepublicanVotes / totalVotes) * 100).toFixed(1);
    const otherPercentage = ((popularVoteResults.totalOtherVotes / totalVotes) * 100).toFixed(1);

    const container = d3.select("#popular-vote-container").html("");

    container
        .style("display", "flex")
        .style("justify-content", "left")
        .style("margin-top", "-50px");

    container.append("div")
        .attr("class", "popular-vote-democrat")
        .style("margin-right", "20px")
        .style("transform", "translateX(300px)")
        .html(`
            <strong>Democrat Total Votes:</strong> ${popularVoteResults.totalDemocratVotes.toLocaleString()}
            <br><strong>(${democratPercentage}% of total)</strong>
        `);

    container.append("div")
        .attr("class", "popular-vote-republican")
        .style("margin-left", "100px")
        .style("transform", "translateX(300px)")
        .html(`
            <strong>Republican Total Votes:</strong> ${popularVoteResults.totalRepublicanVotes.toLocaleString()}
            <br><strong>(${republicanPercentage}% of total)</strong>
        `);

    container.append("div")
        .attr("class", "popular-vote-other")
        .style("margin-left", "100px")
        .style("transform", "translateX(300px)")
        .html(`
            <strong>Other Votes:</strong> ${popularVoteResults.totalOtherVotes.toLocaleString()}
            <br><strong>(${otherPercentage}% of total)</strong>
        `);
}

// Recalculate and display popular vote totals for each county in the dataset
export function recalculateAndDisplayPopularVote(countyData) {
    const popularVoteResults = calculatePopularVote(countyData);
    displayPopularVote(popularVoteResults);
}
