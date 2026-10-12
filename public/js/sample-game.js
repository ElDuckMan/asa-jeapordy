/* Sample game. Load it from the host's Game editor, then edit or replace. */
window.SAMPLE_GAME = {
  title: "ASA Jeopardy",
  rounds: [
    {
      type: "board", name: "Round 1", timer: 0,
      categories: [
        { name: "Festivals", clues: [
          { value: 100, q: "Also called the Spring Festival, it begins with the new moon of the lunar calendar.", a: "What is Lunar New Year?" },
          { value: 200, q: "Mooncakes are traditionally eaten during this autumn holiday.", a: "What is the Mid-Autumn Festival?" },
          { value: 300, q: "Diwali is known as the festival of these.", a: "What are lights?" },
          { value: 400, q: "During Holi, people throw clouds of this at each other.", a: "What is colored powder?" },
          { value: 500, q: "Thailand's new year, Songkran, is celebrated with a nationwide one of these.", a: "What is a water fight?" }
        ]},
        { name: "Street Eats", clues: [
          { value: 100, q: "This Korean side dish is made from fermented napa cabbage.", a: "What is kimchi?" },
          { value: 200, q: "This Vietnamese noodle soup is often made with beef broth.", a: "What is phở?" },
          { value: 300, q: "This Filipino dish stews meat in vinegar, soy sauce, and garlic.", a: "What is adobo?" },
          { value: 400, q: "This Japanese dish is lightly battered, deep-fried seafood or vegetables.", a: "What is tempura?" },
          { value: 500, q: "Rice cooked in coconut milk, this is considered Malaysia's national dish.", a: "What is nasi lemak?" }
        ]},
        { name: "Geography", clues: [
          { value: 100, q: "The capital of Japan.", a: "What is Tokyo?" },
          { value: 200, q: "The world's highest mountain, on the Nepal–China border.", a: "What is Mount Everest?" },
          { value: 300, q: "With more than 17,000 islands, it is the world's largest archipelagic country.", a: "What is Indonesia?" },
          { value: 400, type: "dd", q: "This river flows through China, Myanmar, Laos, Thailand, Cambodia, and Vietnam.", a: "What is the Mekong?" },
          { value: 500, q: "The capital of Mongolia.", a: "What is Ulaanbaatar?" }
        ]},
        { name: "Languages", clues: [
          { value: 100, q: "In Japanese, “arigatou” means this.", a: "What is thank you?" },
          { value: 200, q: "The name of the Korean alphabet.", a: "What is Hangul?" },
          { value: 300, q: "“Xin chào” means hello in this language.", a: "What is Vietnamese?" },
          { value: 400, q: "The national language of the Philippines, based largely on Tagalog.", a: "What is Filipino?" },
          { value: 500, type: "mc", q: "How many main tones does Standard Mandarin have, not counting the neutral tone?", a: "Four", options: ["Two", "Three", "Four", "Five"], correct: 2 }
        ]},
        { name: "Arts & Crafts", clues: [
          { value: 100, q: "The Japanese art of paper folding.", a: "What is origami?" },
          { value: 200, q: "This Indonesian fabric technique uses wax to resist dye.", a: "What is batik?" },
          { value: 300, q: "The traditional Korean dress.", a: "What is hanbok?" },
          { value: 400, q: "Chinese jianzhi is the art of doing this to paper, often red paper.", a: "What is cutting?" },
          { value: 500, timer: 15, q: "The Japanese art of repairing broken pottery with gold.", a: "What is kintsugi?" }
        ]}
      ]
    },
    {
      type: "lightning", name: "Lightning Round", duration: 60, points: 100, penalty: false,
      questions: [
        { q: "Capital of South Korea?", a: "Seoul" },
        { q: "Japanese rice wine?", a: "Sake" },
        { q: "Currency of Japan?", a: "Yen" },
        { q: "Most populous country in the world (since 2023)?", a: "India" },
        { q: "Korean dish of thin, marinated grilled beef?", a: "Bulgogi" },
        { q: "Capital of the Philippines?", a: "Manila" },
        { q: "Indian flatbread baked in a tandoor?", a: "Naan" },
        { q: "World's tallest building, in Dubai?", a: "Burj Khalifa" },
        { q: "Japan's high-speed bullet train network?", a: "Shinkansen" },
        { q: "Capital of Vietnam?", a: "Hanoi" },
        { q: "Official language of Thailand?", a: "Thai" },
        { q: "Japanese art of miniature trees?", a: "Bonsai" }
      ]
    },
    {
      type: "board", name: "Double Round", timer: 0,
      categories: [
        { name: "History", clues: [
          { value: 200, q: "Built over centuries to keep out northern invaders, it stretches across northern China.", a: "What is the Great Wall of China?" },
          { value: 400, q: "This Cambodian temple complex is the largest religious monument in the world.", a: "What is Angkor Wat?" },
          { value: 600, type: "dd", q: "India gained independence from Britain in this year.", a: "What is 1947?" },
          { value: 800, q: "This city was Japan's imperial capital for more than 1,000 years before Tokyo.", a: "What is Kyoto?" },
          { value: 1000, q: "This Mongol leader founded the largest contiguous land empire in history.", a: "Who is Genghis Khan?" }
        ]},
        { name: "Sports & Games", clues: [
          { value: 200, q: "This Korean martial art, an Olympic sport, is famous for its kicks.", a: "What is taekwondo?" },
          { value: 400, q: "This Japanese wrestling style takes place in a ring called a dohyō.", a: "What is sumo?" },
          { value: 600, type: "mc", q: "Sepak takraw is like volleyball, except players may not use their…", a: "Hands", options: ["Feet", "Hands", "Head", "Knees"], correct: 1 },
          { value: 800, q: "Called weiqi in China and baduk in Korea, this board game uses black and white stones.", a: "What is Go?" },
          { value: 1000, q: "This country has won the most Olympic gold medals in badminton.", a: "What is China?" }
        ]},
        { name: "Nature", clues: [
          { value: 200, q: "The giant panda is native to this country.", a: "What is China?" },
          { value: 400, q: "The world's largest lizard lives on a handful of Indonesian islands.", a: "What is the Komodo dragon?" },
          { value: 600, q: "Mount Fuji is this kind of geological feature.", a: "What is a volcano?" },
          { value: 800, q: "A monsoon is a seasonal shift in these.", a: "What are winds?" },
          { value: 1000, q: "The Mariana Trench, the deepest point on Earth, lies in this ocean.", a: "What is the Pacific Ocean?" }
        ]},
        { name: "Numbers", clues: [
          { value: 200, type: "mc", q: "How many animals are in the Chinese zodiac?", a: "12", options: ["8", "10", "12", "24"], correct: 2 },
          { value: 400, q: "This number is lucky in Chinese culture because it sounds like the word for prosperity.", a: "What is 8?" },
          { value: 600, q: "This number is often avoided in East Asia because it sounds like the word for death.", a: "What is 4?" },
          { value: 800, q: "A traditional Japanese haiku has this many sound units in total.", a: "What is 17?" },
          { value: 1000, q: "The Eighth Schedule of India's constitution lists this many languages.", a: "What is 22?" }
        ]},
        { name: "Cities", clues: [
          { value: 200, q: "This city-state at the tip of the Malay Peninsula is called the Lion City.", a: "What is Singapore?" },
          { value: 400, q: "This South Korean capital hosted the 1988 Summer Olympics.", a: "What is Seoul?" },
          { value: 600, q: "Formerly called Saigon, it is Vietnam's largest city.", a: "What is Ho Chi Minh City?" },
          { value: 800, q: "The Petronas Towers stand in this capital city.", a: "What is Kuala Lumpur?" },
          { value: 1000, q: "Formerly Bombay, this Indian city is home to Bollywood.", a: "What is Mumbai?" }
        ]}
      ]
    },
    {
      type: "bonus", name: "Bonus Round", points: 200, timer: 20,
      questions: [
        { q: "Bubble (boba) tea comes from which place?", a: "Taiwan", options: ["Japan", "Taiwan", "Thailand", "Korea"], correct: 1 },
        { q: "Name the steamed dumplings popular in Nepal and Tibet.", a: "Momo" },
        { q: "Which of these is NOT a Chinese zodiac animal?", a: "Cat", options: ["Rooster", "Cat", "Goat", "Pig"], correct: 1 },
        { q: "Which spice gives many curries their yellow color?", a: "Turmeric" }
      ]
    },
    {
      type: "final", name: "Final Round", category: "World Landmarks", timer: 30,
      q: "Built by Mughal emperor Shah Jahan in memory of his wife Mumtaz Mahal, this white marble mausoleum stands in Agra.",
      a: "What is the Taj Mahal?"
    }
  ]
};
