/* Sample game. Load it from the host's Game editor, then edit or replace. */
window.SAMPLE_GAME = {
  "title": "ASA Jeopardy",
  "rounds": [
    {
      "type": "board",
      "name": "Round 1",
      "timer": 0,
      "categories": [
        {
          "name": "Festivals",
          "clues": [
            {
              "value": 100,
              "q": "Also called the Spring Festival, it begins with the new moon of the lunar calendar.",
              "a": "What is Lunar New Year?"
            },
            {
              "value": 200,
              "q": "Mooncakes are traditionally eaten during this autumn holiday.",
              "a": "What is the Mid-Autumn Festival?"
            },
            {
              "value": 300,
              "q": "Diwali is known as the festival of these.",
              "a": "What are lights?"
            },
            {
              "value": 400,
              "q": "During Holi, people throw clouds of this at each other.",
              "a": "What is colored powder?"
            },
            {
              "value": 500,
              "q": "Thailand's new year, Songkran, is celebrated with a nationwide one of these.",
              "a": "What is a water fight?"
            }
          ]
        },
        {
          "name": "Street Eats",
          "clues": [
            {
              "value": 100,
              "q": "This Korean side dish is made from fermented napa cabbage.",
              "a": "What is kimchi?"
            },
            {
              "value": 200,
              "q": "This Vietnamese noodle soup is often made with beef broth.",
              "a": "What is phở?"
            },
            {
              "value": 300,
              "q": "This Filipino dish stews meat in vinegar, soy sauce, and garlic.",
              "a": "What is adobo?"
            },
            {
              "value": 400,
              "q": "This Japanese dish is lightly battered, deep-fried seafood or vegetables.",
              "a": "What is tempura?"
            },
            {
              "value": 500,
              "q": "Rice cooked in coconut milk, this is considered Malaysia's national dish.",
              "a": "What is nasi lemak?"
            }
          ]
        },
        {
          "name": "Geography",
          "clues": [
            {
              "value": 100,
              "q": "The capital of Japan.",
              "a": "What is Tokyo?"
            },
            {
              "value": 200,
              "q": "The world's highest mountain, on the Nepal–China border.",
              "a": "What is Mount Everest?"
            },
            {
              "value": 300,
              "q": "With more than 17,000 islands, it is the world's largest archipelagic country.",
              "a": "What is Indonesia?"
            },
            {
              "value": 400,
              "type": "dd",
              "q": "This river flows through China, Myanmar, Laos, Thailand, Cambodia, and Vietnam.",
              "a": "What is the Mekong?"
            },
            {
              "value": 500,
              "q": "The capital of Mongolia.",
              "a": "What is Ulaanbaatar?"
            }
          ]
        },
        {
          "name": "Languages",
          "clues": [
            {
              "value": 100,
              "q": "In Japanese, “arigatou” means this.",
              "a": "What is thank you?"
            },
            {
              "value": 200,
              "q": "The name of the Korean alphabet.",
              "a": "What is Hangul?"
            },
            {
              "value": 300,
              "q": "“Xin chào” means hello in this language.",
              "a": "What is Vietnamese?"
            },
            {
              "value": 400,
              "q": "The national language of the Philippines, based largely on Tagalog.",
              "a": "What is Filipino?"
            },
            {
              "value": 500,
              "type": "mc",
              "q": "How many main tones does Standard Mandarin have, not counting the neutral tone?",
              "a": "Four",
              "options": [
                "Two",
                "Three",
                "Four",
                "Five"
              ],
              "correct": 2
            }
          ]
        },
        {
          "name": "Arts & Crafts",
          "clues": [
            {
              "value": 100,
              "q": "The Japanese art of paper folding.",
              "a": "What is origami?"
            },
            {
              "value": 200,
              "q": "This Indonesian fabric technique uses wax to resist dye.",
              "a": "What is batik?"
            },
            {
              "value": 300,
              "q": "The traditional Korean dress.",
              "a": "What is hanbok?"
            },
            {
              "value": 400,
              "q": "Chinese jianzhi is the art of doing this to paper, often red paper.",
              "a": "What is cutting?"
            },
            {
              "value": 500,
              "timer": 15,
              "q": "The Japanese art of repairing broken pottery with gold.",
              "a": "What is kintsugi?"
            }
          ]
        },
        {
          "name": "Pop Culture",
          "clues": [
            {
              "value": 100,
              "q": "This South Korean boy band sang “Dynamite” and “Butter.”",
              "a": "Who is BTS?"
            },
            {
              "value": 200,
              "q": "Pikachu is this type of Pokémon.",
              "a": "What is Electric?"
            },
            {
              "value": 300,
              "q": "This 2019 South Korean film was the first non-English-language movie to win Best Picture at the Oscars.",
              "a": "What is Parasite?"
            },
            {
              "value": 400,
              "q": "Hello Kitty was created by this Japanese company.",
              "a": "What is Sanrio?"
            },
            {
              "value": 500,
              "q": "Michelle Yeoh won the Best Actress Oscar for this 2022 film.",
              "a": "What is Everything Everywhere All at Once?"
            }
          ]
        }
      ]
    },
    {
      "type": "lightning",
      "name": "Lightning Round",
      "duration": 60,
      "points": 100,
      "penalty": false,
      "questions": [
        {
          "q": "Capital of South Korea?",
          "a": "Seoul"
        },
        {
          "q": "Japanese rice wine?",
          "a": "Sake"
        },
        {
          "q": "Currency of Japan?",
          "a": "Yen"
        },
        {
          "q": "Most populous country in the world (since 2023)?",
          "a": "India"
        },
        {
          "q": "Korean dish of thin, marinated grilled beef?",
          "a": "Bulgogi"
        },
        {
          "q": "Capital of the Philippines?",
          "a": "Manila"
        },
        {
          "q": "Indian flatbread baked in a tandoor?",
          "a": "Naan"
        },
        {
          "q": "World's tallest building, in Dubai?",
          "a": "Burj Khalifa"
        },
        {
          "q": "Japan's high-speed bullet train network?",
          "a": "Shinkansen"
        },
        {
          "q": "Capital of Vietnam?",
          "a": "Hanoi"
        },
        {
          "q": "Official language of Thailand?",
          "a": "Thai"
        },
        {
          "q": "Japanese art of miniature trees?",
          "a": "Bonsai"
        },
        {
          "q": "Capital of Thailand?",
          "a": "Bangkok"
        },
        {
          "q": "Japanese word for “goodbye”?",
          "a": "Sayonara"
        },
        {
          "q": "Japanese dish of sliced raw fish, served without rice?",
          "a": "Sashimi"
        },
        {
          "q": "Korean liquor often sold in green bottles?",
          "a": "Soju"
        },
        {
          "q": "Indian festival of colors?",
          "a": "Holi"
        },
        {
          "q": "What are Japanese comic books called?",
          "a": "Manga"
        },
        {
          "q": "Japanese art of flower arranging?",
          "a": "Ikebana"
        },
        {
          "q": "What are Japanese animated shows and films called?",
          "a": "Anime"
        },
        {
          "q": "Nepali name for Mount Everest?",
          "a": "Sagarmatha"
        }
      ]
    },
    {
      "type": "board",
      "name": "Double Round",
      "timer": 0,
      "categories": [
        {
          "name": "History",
          "clues": [
            {
              "value": 200,
              "q": "Built over centuries to keep out northern invaders, it stretches across northern China.",
              "a": "What is the Great Wall of China?"
            },
            {
              "value": 400,
              "q": "This Cambodian temple complex is the largest religious monument in the world.",
              "a": "What is Angkor Wat?"
            },
            {
              "value": 600,
              "type": "dd",
              "q": "India gained independence from Britain in this year.",
              "a": "What is 1947?"
            },
            {
              "value": 800,
              "q": "This city was Japan's imperial capital for more than 1,000 years before Tokyo.",
              "a": "What is Kyoto?"
            },
            {
              "value": 1000,
              "q": "This Mongol leader founded the largest contiguous land empire in history.",
              "a": "Who is Genghis Khan?"
            }
          ]
        },
        {
          "name": "Sports & Games",
          "clues": [
            {
              "value": 200,
              "q": "This Korean martial art, an Olympic sport, is famous for its kicks.",
              "a": "What is taekwondo?"
            },
            {
              "value": 400,
              "q": "This Japanese wrestling style takes place in a ring called a dohyō.",
              "a": "What is sumo?"
            },
            {
              "value": 600,
              "type": "mc",
              "q": "Sepak takraw is like volleyball, except players may not use their…",
              "a": "Hands",
              "options": [
                "Feet",
                "Hands",
                "Head",
                "Knees"
              ],
              "correct": 1
            },
            {
              "value": 800,
              "q": "Called weiqi in China and baduk in Korea, this board game uses black and white stones.",
              "a": "What is Go?"
            },
            {
              "value": 1000,
              "q": "This country has won the most Olympic gold medals in badminton.",
              "a": "What is China?"
            }
          ]
        },
        {
          "name": "Nature",
          "clues": [
            {
              "value": 200,
              "q": "The giant panda is native to this country.",
              "a": "What is China?"
            },
            {
              "value": 400,
              "q": "The world's largest lizard lives on a handful of Indonesian islands.",
              "a": "What is the Komodo dragon?"
            },
            {
              "value": 600,
              "q": "Mount Fuji is this kind of geological feature.",
              "a": "What is a volcano?"
            },
            {
              "value": 800,
              "q": "A monsoon is a seasonal shift in these.",
              "a": "What are winds?"
            },
            {
              "value": 1000,
              "q": "The Mariana Trench, the deepest point on Earth, lies in this ocean.",
              "a": "What is the Pacific Ocean?"
            }
          ]
        },
        {
          "name": "Numbers",
          "clues": [
            {
              "value": 200,
              "type": "mc",
              "q": "How many animals are in the Chinese zodiac?",
              "a": "12",
              "options": [
                "8",
                "10",
                "12",
                "24"
              ],
              "correct": 2
            },
            {
              "value": 400,
              "q": "This number is lucky in Chinese culture because it sounds like the word for prosperity.",
              "a": "What is 8?"
            },
            {
              "value": 600,
              "q": "This number is often avoided in East Asia because it sounds like the word for death.",
              "a": "What is 4?"
            },
            {
              "value": 800,
              "q": "A traditional Japanese haiku has this many sound units in total.",
              "a": "What is 17?"
            },
            {
              "value": 1000,
              "q": "The Eighth Schedule of India's constitution lists this many languages.",
              "a": "What is 22?"
            }
          ]
        },
        {
          "name": "Cities",
          "clues": [
            {
              "value": 200,
              "q": "This city-state at the tip of the Malay Peninsula is called the Lion City.",
              "a": "What is Singapore?"
            },
            {
              "value": 400,
              "q": "This South Korean capital hosted the 1988 Summer Olympics.",
              "a": "What is Seoul?"
            },
            {
              "value": 600,
              "q": "Formerly called Saigon, it is Vietnam's largest city.",
              "a": "What is Ho Chi Minh City?"
            },
            {
              "value": 800,
              "q": "The Petronas Towers stand in this capital city.",
              "a": "What is Kuala Lumpur?"
            },
            {
              "value": 1000,
              "q": "Formerly Bombay, this Indian city is home to Bollywood.",
              "a": "What is Mumbai?"
            }
          ]
        },
        {
          "name": "Music & Film",
          "clues": [
            {
              "value": 200,
              "q": "Jisoo, Jennie, Rosé, and Lisa make up this K-pop girl group.",
              "a": "Who is Blackpink?"
            },
            {
              "value": 400,
              "q": "Studio Ghibli made this 2001 film about a girl named Chihiro.",
              "a": "What is Spirited Away?"
            },
            {
              "value": 600,
              "q": "Most Bollywood films are made in this language.",
              "a": "What is Hindi?"
            },
            {
              "value": 800,
              "q": "PSY's 2012 hit was the first YouTube video to reach one billion views.",
              "a": "What is “Gangnam Style”?"
            },
            {
              "value": 1000,
              "q": "This Taiwan-born director made “Crouching Tiger, Hidden Dragon” and “Life of Pi.”",
              "a": "Who is Ang Lee?"
            }
          ]
        },
        {
          "name": "World Cup",
          "clues": [
            {
              "value": 200,
              "q": "In 2002, South Korea and this country co-hosted the first World Cup held in Asia.",
              "a": "What is Japan?"
            },
            {
              "value": 400,
              "q": "This Middle Eastern country hosted the 2022 World Cup.",
              "a": "What is Qatar?"
            },
            {
              "value": 600,
              "q": "At the 2022 World Cup, this country stunned eventual champion Argentina 2–1 in the group stage.",
              "a": "What is Saudi Arabia?"
            },
            {
              "value": 800,
              "q": "South Korea reached this round at the 2002 World Cup, the best finish ever by an Asian team.",
              "a": "What is the semifinals?"
            },
            {
              "value": 1000,
              "q": "In 1966, this Asian team shocked Italy 1–0 and reached the quarterfinals.",
              "a": "What is North Korea?"
            }
          ]
        }
      ]
    },
    {
      "type": "bonus",
      "name": "Bonus Round",
      "points": 200,
      "timer": 20,
      "questions": [
        {
          "q": "Bubble (boba) tea comes from which place?",
          "a": "Taiwan",
          "options": [
            "Japan",
            "Taiwan",
            "Thailand",
            "Korea"
          ],
          "correct": 1
        },
        {
          "q": "Name the steamed dumplings popular in Nepal and Tibet.",
          "a": "Momo"
        },
        {
          "q": "Which of these is NOT a Chinese zodiac animal?",
          "a": "Cat",
          "options": [
            "Rooster",
            "Cat",
            "Goat",
            "Pig"
          ],
          "correct": 1
        },
        {
          "q": "Which spice gives many curries their yellow color?",
          "a": "Turmeric"
        },
        {
          "q": "Which of these is a Japanese dish?",
          "a": "Sushi",
          "options": [
            "Bibimbap",
            "Sushi",
            "Phở",
            "Pad Thai"
          ],
          "correct": 1
        },
        {
          "q": "What is the Korean word for grandmother, also used for older women?",
          "a": "Halmeoni"
        },
        {
          "q": "What is India's national animal?",
          "a": "Tiger",
          "options": [
            "Lion",
            "Tiger",
            "Elephant",
            "Peacock"
          ],
          "correct": 1
        }
      ]
    },
    {
      "type": "final",
      "name": "Final Round",
      "category": "World Landmarks",
      "timer": 30,
      "q": "Built by Mughal emperor Shah Jahan in memory of his wife Mumtaz Mahal, this white marble mausoleum stands in Agra.",
      "a": "What is the Taj Mahal?",
      "hint": "It's the most famous building in India."
    },
    {
      "type": "board",
      "name": "Hard Round",
      "timer": 0,
      "categories": [
        {
          "name": "History",
          "clues": [
            {
              "value": 400,
              "q": "This fourth king of Korea's Joseon dynasty introduced the Hangul alphabet in 1446.",
              "a": "Who is King Sejong (the Great)?",
              "hint": "His face is on South Korea's 10,000-won note."
            },
            {
              "value": 800,
              "q": "The 1868 restoration that returned power to Japan's emperor bears this emperor's name.",
              "a": "Who is Meiji?",
              "hint": "It means \"enlightened rule.\""
            },
            {
              "value": 1200,
              "q": "Formerly East Pakistan, this country won its independence in 1971.",
              "a": "What is Bangladesh?",
              "hint": "Its capital is Dhaka."
            },
            {
              "value": 1600,
              "type": "dd",
              "q": "The Khmer Rouge seized power in Cambodia in this year.",
              "a": "What is 1975?",
              "hint": "The same year the Vietnam War ended."
            },
            {
              "value": 2000,
              "timer": 20,
              "q": "The 1842 Treaty of Nanking, ending the First Opium War, ceded this island to Britain.",
              "a": "What is Hong Kong (Island)?",
              "hint": "Today it's a Special Administrative Region of China."
            }
          ]
        },
        {
          "name": "Geography",
          "clues": [
            {
              "value": 400,
              "q": "Asia's longest river.",
              "a": "What is the Yangtze?",
              "hint": "It flows through Shanghai."
            },
            {
              "value": 800,
              "q": "Lake Baikal, the world's deepest lake, is in this country.",
              "a": "What is Russia?",
              "hint": "It's in Siberia."
            },
            {
              "value": 1200,
              "q": "It is the only Southeast Asian country never colonized by a European power.",
              "a": "What is Thailand?",
              "hint": "Its old name was Siam."
            },
            {
              "value": 1600,
              "q": "The capital of Kazakhstan.",
              "a": "What is Astana?",
              "hint": "It was called Nur-Sultan from 2019 to 2022."
            },
            {
              "value": 2000,
              "timer": 20,
              "q": "This strait separates Sri Lanka from India.",
              "a": "What is the Palk Strait?",
              "hint": "It shares a name with a British colonial governor of Madras."
            }
          ]
        },
        {
          "name": "Food & Drink",
          "clues": [
            {
              "value": 400,
              "q": "Japanese dashi is usually made from kombu and flakes of this dried, smoked fish.",
              "a": "What is bonito (katsuobushi)?",
              "hint": "The same fish as skipjack tuna."
            },
            {
              "value": 800,
              "q": "This costly spice comes from the dried stigmas of a crocus flower.",
              "a": "What is saffron?",
              "hint": "It turns biryani and paella golden."
            },
            {
              "value": 1200,
              "q": "This fermented Korean chili paste gives tteokbokki its sauce.",
              "a": "What is gochujang?",
              "hint": "Its name starts with \"gochu,\" the Korean word for chili pepper."
            },
            {
              "value": 1600,
              "q": "The bread in a Vietnamese bánh mì comes from this colonial power's baguette.",
              "a": "What is France?",
              "hint": "Its capital is Paris."
            },
            {
              "value": 2000,
              "timer": 20,
              "q": "Named after a Chinese island, Hainanese chicken rice is a national dish of this city-state.",
              "a": "What is Singapore?",
              "hint": "It's also called the Lion City."
            }
          ]
        },
        {
          "name": "Language & Writing",
          "clues": [
            {
              "value": 400,
              "q": "Japanese writing uses hiragana, katakana, and these Chinese-derived characters.",
              "a": "What is kanji?",
              "hint": "The same characters are called hanzi in China."
            },
            {
              "value": 800,
              "q": "This script is used to write Hindi, Marathi, and Sanskrit.",
              "a": "What is Devanagari?",
              "hint": "Its name means \"city of the gods.\""
            },
            {
              "value": 1200,
              "type": "mc",
              "q": "Which language has the most native speakers in the world?",
              "a": "Mandarin Chinese",
              "options": [
                "English",
                "Spanish",
                "Mandarin Chinese",
                "Hindi"
              ],
              "correct": 2,
              "hint": "Over 900 million native speakers."
            },
            {
              "value": 1600,
              "q": "Vietnamese is written in this Latin-based alphabet, whose name means “national language script.”",
              "a": "What is chữ Quốc ngữ?",
              "hint": "Created by missionaries in the 1600s."
            },
            {
              "value": 2000,
              "timer": 20,
              "q": "In Tagalog, “salamat” means this.",
              "a": "What is thank you?",
              "hint": "Said after someone does you a favor."
            }
          ]
        },
        {
          "name": "Science & Inventions",
          "clues": [
            {
              "value": 400,
              "q": "China's Four Great Inventions are paper, printing, the compass, and this.",
              "a": "What is gunpowder?",
              "hint": "It was first developed by alchemists searching for an elixir of life."
            },
            {
              "value": 800,
              "q": "In 628 CE, this Indian mathematician wrote the first rules for using zero as a number.",
              "a": "Who is Brahmagupta?",
              "hint": "His book's title means \"The Correctly Established Doctrine of Brahma.\""
            },
            {
              "value": 1200,
              "type": "dd",
              "q": "In February 1970, this became the first Asian country to put its own satellite into orbit.",
              "a": "What is Japan?",
              "hint": "Its satellite was named Ōsumi."
            },
            {
              "value": 1600,
              "q": "This Indian physicist won the 1930 Nobel Prize in Physics for his work on the scattering of light.",
              "a": "Who is C. V. Raman?",
              "hint": "Bangalore's Raman Research Institute is named after him."
            },
            {
              "value": 2000,
              "timer": 20,
              "q": "Instant ramen was invented in 1958 by this founder of Nissin.",
              "a": "Who is Momofuku Ando?",
              "hint": "His company's most famous product is Cup Noodles."
            }
          ]
        },
        {
          "name": "Religion & Philosophy",
          "clues": [
            {
              "value": 400,
              "q": "Founded by Siddhartha Gautama, this religion began in present-day India and Nepal.",
              "a": "What is Buddhism?",
              "hint": "Its followers seek enlightenment, or nirvana."
            },
            {
              "value": 800,
              "q": "This Chinese philosopher's sayings were collected in the Analects.",
              "a": "Who is Confucius?",
              "hint": "He lived around 500 BCE and taught respect for elders."
            },
            {
              "value": 1200,
              "q": "Shinto, Japan's native religion, honors spirits called these.",
              "a": "What are kami?",
              "hint": "The same word appears in “kamikaze,” meaning “divine wind.”"
            },
            {
              "value": 1600,
              "q": "The Golden Temple in Amritsar is the holiest site of this religion.",
              "a": "What is Sikhism?",
              "hint": "It was founded by Guru Nanak."
            },
            {
              "value": 2000,
              "timer": 20,
              "q": "This 9th-century temple in Central Java is the largest Buddhist temple in the world.",
              "a": "What is Borobudur?",
              "hint": "It's near the city of Yogyakarta, Indonesia."
            }
          ]
        }
      ]
    },
    {
      "type": "lightning",
      "name": "Hard Lightning",
      "duration": 60,
      "points": 200,
      "penalty": true,
      "questions": [
        {
          "q": "Capital of Laos?",
          "a": "Vientiane",
          "hint": "It sits on the Mekong River."
        },
        {
          "q": "Capital of Myanmar?",
          "a": "Naypyidaw",
          "hint": "It replaced Yangon as the capital in the mid-2000s."
        },
        {
          "q": "Capital of Bhutan?",
          "a": "Thimphu",
          "hint": "Starts with \"Thim…\""
        },
        {
          "q": "Capital of Pakistan?",
          "a": "Islamabad",
          "hint": "Near the city of Rawalpindi."
        },
        {
          "q": "Capital of Taiwan?",
          "a": "Taipei",
          "hint": "Home of the Taipei 101 skyscraper."
        },
        {
          "q": "Currency of South Korea?",
          "a": "Won",
          "hint": "Also the name of North Korea's currency."
        },
        {
          "q": "Currency of India?",
          "a": "Rupee",
          "hint": "Also used in Pakistan and Nepal."
        },
        {
          "q": "Japanese word for “cheers”?",
          "a": "Kanpai",
          "hint": "Literally \"dry cup.\""
        },
        {
          "q": "Hindi word for “tea”?",
          "a": "Chai",
          "hint": "Rhymes with \"high.\""
        },
        {
          "q": "How many main islands make up Japan?",
          "a": "Four",
          "hint": "Honshu is the biggest."
        },
        {
          "q": "Country home to the Silk Road city of Samarkand?",
          "a": "Uzbekistan",
          "hint": "Its capital is Tashkent."
        },
        {
          "q": "Strait between the Malay Peninsula and Sumatra?",
          "a": "Strait of Malacca",
          "hint": "Named for a Malaysian port city."
        },
        {
          "q": "Japanese poem of 31 syllables?",
          "a": "Tanka",
          "hint": "Older than the haiku."
        },
        {
          "q": "Capital of Cambodia?",
          "a": "Phnom Penh",
          "hint": "It sits where the Mekong meets the Tonlé Sap River."
        },
        {
          "q": "Capital of Nepal?",
          "a": "Kathmandu",
          "hint": "Starts with “Kath…”"
        },
        {
          "q": "Currency of China?",
          "a": "Yuan (renminbi)",
          "hint": "Its symbol is ¥, like Japan's."
        },
        {
          "q": "Currency of Vietnam?",
          "a": "Dong",
          "hint": "Rhymes with “song.”"
        },
        {
          "q": "Japanese martial art whose name means “empty hand”?",
          "a": "Karate",
          "hint": "Ranked by belt colors, practiced in a gi."
        },
        {
          "q": "How do you say “hello” politely in Korean?",
          "a": "Annyeonghaseyo",
          "hint": "Starts with “Annyeong…”"
        },
        {
          "q": "Island country formerly called Ceylon?",
          "a": "Sri Lanka",
          "hint": "Famous for its tea."
        },
        {
          "q": "National language of Pakistan?",
          "a": "Urdu",
          "hint": "A close cousin of Hindi."
        }
      ]
    },
    {
      "type": "bonus",
      "name": "Hard Bonus",
      "points": 300,
      "timer": 25,
      "questions": [
        {
          "q": "Angkor Wat was originally built as a temple to which Hindu god?",
          "a": "Vishnu",
          "options": [
            "Shiva",
            "Vishnu",
            "Brahma",
            "Ganesha"
          ],
          "correct": 1,
          "hint": "He's the preserver god in the Hindu trinity."
        },
        {
          "q": "Which of these is NOT an official language of Singapore?",
          "a": "Hokkien",
          "options": [
            "English",
            "Malay",
            "Tamil",
            "Hokkien"
          ],
          "correct": 3,
          "hint": "Mandarin is official; this other Chinese language is not."
        },
        {
          "q": "Name the Korean harvest holiday often called “Korean Thanksgiving.”",
          "a": "Chuseok",
          "hint": "Celebrated on the 15th day of the 8th lunar month."
        },
        {
          "q": "Who founded the Mughal Empire in 1526?",
          "a": "Babur",
          "options": [
            "Akbar",
            "Babur",
            "Humayun",
            "Aurangzeb"
          ],
          "correct": 1,
          "hint": "He was a descendant of Timur and Genghis Khan."
        },
        {
          "q": "Which Indian emperor converted to Buddhism after the Kalinga War?",
          "a": "Ashoka",
          "options": [
            "Ashoka",
            "Chandragupta",
            "Akbar",
            "Shah Jahan"
          ],
          "correct": 0,
          "hint": "His lion capital is India's national emblem."
        },
        {
          "q": "Name the powdered green tea used in the Japanese tea ceremony.",
          "a": "Matcha",
          "hint": "Also popular in lattes and ice cream."
        },
        {
          "q": "The Silk Road's eastern end was the Chinese capital then called:",
          "a": "Chang'an",
          "options": [
            "Beijing",
            "Chang'an",
            "Nanjing",
            "Shanghai"
          ],
          "correct": 1,
          "hint": "Today it's called Xi'an, home of the Terracotta Army."
        }
      ]
    },
    {
      "type": "final",
      "name": "Hard Final",
      "category": "Explorers",
      "timer": 30,
      "q": "Between 1405 and 1433, this Ming dynasty admiral led seven treasure voyages that reached as far as East Africa.",
      "a": "Who is Zheng He?",
      "hint": "He sailed generations before Columbus, with ships far larger."
    }
  ]
};
