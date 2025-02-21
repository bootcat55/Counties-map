import * as d3 from 'd3';

// Constants
const SPACING = 150; // 50px spacing between Democrat and Republican, and Republican and Other
const LABEL_OFFSET = 350; // 150px offset to shift all labels to the right
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
        .html("") // Clear the container
        .style("display", "flex")
        .style("justify-content", "flex-start") // Align items to the left
        .style("align-items", "center") // Vertically center items
        .style("margin-top", "-50px")
        .style("width", `calc(100% - ${LABEL_OFFSET}px)`) // Adjust width to account for the offset
        .style("padding-left", `${LABEL_OFFSET}px`); // Use padding instead of transform to shift content
};

// Helper function to append vote information to the container
const appendVoteInfo = (container, className, label, votes, percentage, marginLeft = 0) => {
    container.append("div")
        .attr("class", className)
        .style("margin-left", `${marginLeft}px`) // Apply margin-left for spacing
        .style("white-space", "nowrap") // Prevent text from wrapping
        .html(`
            <strong>${label}:</strong> ${votes.toLocaleString()}
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

    // Append Democrat label with no additional left margin
    appendVoteInfo(container, "popular-vote-democrat", "Democrat", popularVoteResults.totalDemocratVotes, democratPercentage);

    // Append Republican label with 50px left margin
    appendVoteInfo(container, "popular-vote-republican", "Republican", popularVoteResults.totalRepublicanVotes, republicanPercentage, SPACING);

    // Append Other label with 50px left margin (only after Republican, not cumulative)
    appendVoteInfo(container, "popular-vote-other", "Other", popularVoteResults.totalOtherVotes, otherPercentage, SPACING);
}

// Recalculate and display popular vote totals for each county in the dataset
export function recalculateAndDisplayPopularVote(countyData) {
    const popularVoteResults = calculatePopularVote(countyData);
    displayPopularVote(popularVoteResults);
}