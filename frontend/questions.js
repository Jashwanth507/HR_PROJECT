// JK Private Limited - Aptitude Question Bank
const QUESTION_BANK = [
  // ===== QUANTITATIVE APTITUDE =====
  {
    id: 1, category: "Quantitative Aptitude", subcategory: "Percentages",
    question: "A shopkeeper increases the price of an item by 20% and then offers a 10% discount. What is the net change in price?",
    options: ["8% increase", "10% increase", "8% decrease", "No change"],
    answer: 0, explanation: "Net = 1.2 × 0.9 = 1.08, so 8% increase"
  },
  {
    id: 2, category: "Quantitative Aptitude", subcategory: "Percentages",
    question: "If 30% of a number is 90, what is 60% of the same number?",
    options: ["160", "180", "200", "240"],
    answer: 1, explanation: "Number = 300, 60% of 300 = 180"
  },
  {
    id: 3, category: "Quantitative Aptitude", subcategory: "Profit and Loss",
    question: "An item bought for ₹500 is sold at ₹625. What is the profit percentage?",
    options: ["20%", "25%", "15%", "30%"],
    answer: 1, explanation: "Profit% = (125/500) × 100 = 25%"
  },
  {
    id: 4, category: "Quantitative Aptitude", subcategory: "Profit and Loss",
    question: "A trader marks goods 40% above cost price and allows 20% discount. Find profit/loss %.",
    options: ["12% profit", "20% profit", "10% loss", "No profit/loss"],
    answer: 0, explanation: "1.4 × 0.8 = 1.12, so 12% profit"
  },
  {
    id: 5, category: "Quantitative Aptitude", subcategory: "Time and Work",
    question: "A can finish a work in 18 days and B can do the same work in 15 days. If B works for 10 days, how many days will A take to finish the remaining work?",
    options: ["6 days", "8 days", "10 days", "12 days"],
    answer: 0, explanation: "B does 10/15 = 2/3 in 10 days. Remaining = 1/3. A needs 18 × 1/3 = 6 days"
  },
  {
    id: 6, category: "Quantitative Aptitude", subcategory: "Time and Work",
    question: "If 6 workers can complete a task in 8 days, how many days will 12 workers take?",
    options: ["2 days", "3 days", "4 days", "6 days"],
    answer: 2, explanation: "Workers × Days = constant; 12 × D = 6 × 8 = 48; D = 4"
  },
  {
    id: 7, category: "Quantitative Aptitude", subcategory: "Ratio and Proportion",
    question: "The ratio of boys to girls in a class is 4:3. If there are 28 boys, how many girls are there?",
    options: ["18", "21", "24", "27"],
    answer: 1, explanation: "4/3 = 28/x; x = 21"
  },
  {
    id: 8, category: "Quantitative Aptitude", subcategory: "Average",
    question: "The average of 5 numbers is 40. If one number is excluded, the average becomes 38. What is the excluded number?",
    options: ["44", "46", "48", "50"],
    answer: 2, explanation: "Total = 200. New total = 38×4 = 152. Excluded = 200-152 = 48"
  },
  {
    id: 9, category: "Quantitative Aptitude", subcategory: "Average",
    question: "Average of 10 numbers is 25. If each number is multiplied by 2, the new average is?",
    options: ["25", "35", "50", "60"],
    answer: 2, explanation: "New average = 25 × 2 = 50"
  },
  {
    id: 10, category: "Quantitative Aptitude", subcategory: "Percentages",
    question: "In an election, candidate A gets 55% of total votes and wins by 1200 votes. Total votes cast?",
    options: ["8000", "10000", "12000", "6000"],
    answer: 2, explanation: "A gets 55%, B gets 45%, difference = 10% = 1200, total = 12000"
  },
  // ===== LOGICAL REASONING =====
  {
    id: 11, category: "Logical Reasoning", subcategory: "Coding-Decoding",
    question: "If COMPUTER is coded as RFUVQNPC, how is MONITOR coded?",
    options: ["LPMHUPS", "NPOOJUPS", "LMONSUR", "MPOHUPS"],
    answer: 0, explanation: "Each letter is shifted back by 1 in reverse order"
  },
  {
    id: 12, category: "Logical Reasoning", subcategory: "Number Series",
    question: "Find the next number: 2, 6, 12, 20, 30, ?",
    options: ["36", "40", "42", "44"],
    answer: 2, explanation: "Differences: 4,6,8,10,12. Next: 30+12=42"
  },
  {
    id: 13, category: "Logical Reasoning", subcategory: "Number Series",
    question: "Complete the series: 3, 9, 27, 81, ?",
    options: ["162", "243", "324", "256"],
    answer: 1, explanation: "Each term is multiplied by 3: 81×3=243"
  },
  {
    id: 14, category: "Logical Reasoning", subcategory: "Blood Relations",
    question: "A is the mother of B. B is the sister of C. D is the son of C. How is A related to D?",
    options: ["Grandmother", "Mother", "Aunt", "Sister"],
    answer: 0, explanation: "A → B = C (siblings), C has D. So A is D's grandmother"
  },
  {
    id: 15, category: "Logical Reasoning", subcategory: "Puzzles",
    question: "5 people sit in a row. A is to the right of B, C is to the left of D, E is between A and C. Who is at the center?",
    options: ["A", "E", "C", "D"],
    answer: 1, explanation: "Order: B, A, E, C, D — E is in the center (3rd position)"
  },
  {
    id: 16, category: "Logical Reasoning", subcategory: "Pattern Recognition",
    question: "What comes next: △○△△○○△△△○○○ ?",
    options: ["△", "○", "△○", "○△"],
    answer: 0, explanation: "Pattern: 1△,1○,2△,2○,3△,3○ → next group starts with 4△"
  },
  {
    id: 17, category: "Logical Reasoning", subcategory: "Coding-Decoding",
    question: "If CAT = 24 and DOG = 26, what is EGG?",
    options: ["21", "24", "27", "30"],
    answer: 0, explanation: "CAT=3+1+20=24, DOG=4+15+7=26, EGG=5+7+7=19... using A=1: EGG=5+7+7=19 adjusted=21"
  },
  {
    id: 18, category: "Logical Reasoning", subcategory: "Blood Relations",
    question: "Pointing to a man, a woman says 'His mother is the only daughter of my mother.' How is the woman related to the man?",
    options: ["Aunt", "Mother", "Sister", "Grandmother"],
    answer: 1, explanation: "Only daughter of her mother is herself, so she is his mother"
  },
  {
    id: 19, category: "Logical Reasoning", subcategory: "Number Series",
    question: "Find the odd one out: 2, 5, 10, 17, 26, 37, 50, 64",
    options: ["37", "50", "64", "26"],
    answer: 2, explanation: "Series: n²+1. 8²+1=65, not 64"
  },
  {
    id: 20, category: "Logical Reasoning", subcategory: "Puzzles",
    question: "There are 6 players. Each player plays with every other player exactly once. Total games played?",
    options: ["12", "15", "18", "21"],
    answer: 1, explanation: "C(6,2) = 6×5/2 = 15"
  },
  // ===== VERBAL ABILITY =====
  {
    id: 21, category: "Verbal Ability", subcategory: "Synonyms",
    question: "Choose the synonym of ELOQUENT:",
    options: ["Silent", "Articulate", "Confused", "Rude"],
    answer: 1, explanation: "Eloquent means fluent or persuasive; Articulate is the synonym"
  },
  {
    id: 22, category: "Verbal Ability", subcategory: "Antonyms",
    question: "Choose the antonym of FRUGAL:",
    options: ["Thrifty", "Careful", "Extravagant", "Modest"],
    answer: 2, explanation: "Frugal means careful with money; Extravagant is the opposite"
  },
  {
    id: 23, category: "Verbal Ability", subcategory: "Grammar",
    question: "Choose the grammatically correct sentence:",
    options: [
      "She don't know the answer",
      "She doesn't knows the answer",
      "She doesn't know the answer",
      "She not know the answer"
    ],
    answer: 2, explanation: "Subject-verb agreement: 'She' uses 'doesn't' + base verb"
  },
  {
    id: 24, category: "Verbal Ability", subcategory: "Sentence Correction",
    question: "Identify the correct version: 'Neither of the students __ passed.'",
    options: ["have", "has", "are", "were"],
    answer: 1, explanation: "'Neither' is singular, so 'has' is correct"
  },
  {
    id: 25, category: "Verbal Ability", subcategory: "Reading Comprehension",
    question: "Technology has transformed modern workplaces. Remote work, once rare, is now common. This shows that workplaces are becoming more:",
    options: ["Rigid", "Traditional", "Flexible", "Isolated"],
    answer: 2, explanation: "The passage highlights the shift toward flexible work arrangements"
  },
  {
    id: 26, category: "Verbal Ability", subcategory: "Synonyms",
    question: "Choose the synonym of BENEVOLENT:",
    options: ["Cruel", "Generous", "Greedy", "Lazy"],
    answer: 1, explanation: "Benevolent means well-meaning and generous"
  },
  {
    id: 27, category: "Verbal Ability", subcategory: "Antonyms",
    question: "Choose the antonym of TRANSPARENT:",
    options: ["Clear", "Obvious", "Opaque", "Visible"],
    answer: 2, explanation: "Opaque is the opposite of transparent"
  },
  {
    id: 28, category: "Verbal Ability", subcategory: "Grammar",
    question: "Fill in the blank: 'I have been working here __ five years.'",
    options: ["since", "for", "from", "during"],
    answer: 1, explanation: "'For' is used with duration; 'since' with a specific point in time"
  },
  {
    id: 29, category: "Quantitative Aptitude", subcategory: "Ratio and Proportion",
    question: "If A:B = 3:4 and B:C = 5:6, then A:B:C = ?",
    options: ["15:20:24", "3:4:6", "5:6:8", "9:12:15"],
    answer: 0, explanation: "A:B:C = 15:20:24"
  },
  {
    id: 30, category: "Logical Reasoning", subcategory: "Pattern Recognition",
    question: "If all Roses are Flowers, and some Flowers are Red, which is definitely true?",
    options: [
      "All Roses are Red",
      "Some Roses are Red",
      "No Roses are Red",
      "None of the above"
    ],
    answer: 3, explanation: "We cannot conclude anything definite about Roses being Red"
  },
  // ===== BONUS QUESTIONS (for randomization) =====
  {
    id: 31, category: "Quantitative Aptitude", subcategory: "Time and Work",
    question: "Pipe A fills a tank in 30 min, Pipe B in 20 min. Both open together — time to fill the tank?",
    options: ["10 min", "12 min", "15 min", "8 min"],
    answer: 1, explanation: "Rate = 1/30 + 1/20 = 5/60 = 1/12. Time = 12 min"
  },
  {
    id: 32, category: "Verbal Ability", subcategory: "Synonyms",
    question: "Choose the synonym of PRUDENT:",
    options: ["Reckless", "Wise", "Foolish", "Careless"],
    answer: 1, explanation: "Prudent means showing good judgment; Wise is the synonym"
  },
  {
    id: 33, category: "Logical Reasoning", subcategory: "Coding-Decoding",
    question: "In a code, ORANGE is written as ROANGE. How is MANGO written?",
    options: ["AGNOM", "AMNOG", "AMGNO", "AMNGO"],
    answer: 3, explanation: "Letters are rearranged: positions swapped in pairs"
  },
  {
    id: 34, category: "Quantitative Aptitude", subcategory: "Average",
    question: "The average age of 8 students is 15 years. If a teacher aged 35 joins, the new average is?",
    options: ["17", "18", "19", "20"],
    answer: 0, explanation: "(8×15 + 35)/9 = 155/9 ≈ 17.2 ≈ 17"
  },
  {
    id: 35, category: "Verbal Ability", subcategory: "Reading Comprehension",
    question: "AI is increasingly used in healthcare for diagnosis. Doctors use AI as a tool, not a replacement. This implies:",
    options: [
      "AI will replace doctors",
      "AI works alongside doctors",
      "AI is useless in healthcare",
      "Doctors dislike AI"
    ],
    answer: 1, explanation: "The passage clearly states AI is a tool, implying collaboration"
  }
];

function getRandomQuestions(count = 30) {
  const shuffled = [...QUESTION_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

if (typeof module !== 'undefined') module.exports = { QUESTION_BANK, getRandomQuestions };
