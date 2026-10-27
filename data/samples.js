// Samples marquants de la discographie (sélection, pas une liste exhaustive).
// Source : Wikipedia, « List of Kanye West samples and sampling disputes » (vérifié en octobre 2026).
//
// album  : id de l'album (data/albums.js) ; titre : titre exact du morceau (data/tracklists.js)
// sample : { artiste, titre, annee } du morceau d'origine (annee optionnelle)
// type   : "sample" (extrait repris), "interpolation" (rejoué / rechanté), "voix" (discours, film, vidéo)
// note   : petite phrase optionnelle affichée sous la carte

window.SAMPLES = [
  // The College Dropout
  { album: "college-dropout", titre: "Through the Wire", sample: { artiste: "Chaka Khan", titre: "Through the Fire", annee: 1984 }, type: "sample",
    note: "Accéléré façon « chipmunk soul », la signature de ses débuts." },
  { album: "college-dropout", titre: "Jesus Walks", sample: { artiste: "The ARC Choir", titre: "Walk With Me", annee: 1997 }, type: "sample" },
  { album: "college-dropout", titre: "Slow Jamz", sample: { artiste: "Luther Vandross", titre: "A House Is Not a Home", annee: 1981 }, type: "sample" },
  { album: "college-dropout", titre: "All Falls Down", sample: { artiste: "Lauryn Hill", titre: "Mystery of Iniquity", annee: 2002 }, type: "interpolation",
    note: "Le sample n'ayant pas été autorisé, Syleena Johnson rechante la mélodie." },
  { album: "college-dropout", titre: "Spaceship", sample: { artiste: "Marvin Gaye", titre: "Distant Lover", annee: 1974 }, type: "sample" },

  // Late Registration
  { album: "late-registration", titre: "Gold Digger", sample: { artiste: "Ray Charles", titre: "I Got a Woman", annee: 1954 }, type: "sample",
    note: "Rechanté par Jamie Foxx, qui venait de jouer Ray Charles au cinéma." },
  { album: "late-registration", titre: "Touch the Sky", sample: { artiste: "Curtis Mayfield", titre: "Move On Up", annee: 1970 }, type: "sample" },
  { album: "late-registration", titre: "Diamonds from Sierra Leone", sample: { artiste: "Shirley Bassey", titre: "Diamonds Are Forever", annee: 1971 }, type: "sample" },
  { album: "late-registration", titre: "Heard 'Em Say", sample: { artiste: "Natalie Cole", titre: "Someone That I Used to Love", annee: 1980 }, type: "sample" },
  { album: "late-registration", titre: "Gone", sample: { artiste: "Otis Redding", titre: "It's Too Late", annee: 1965 }, type: "sample" },
  { album: "late-registration", titre: "Addiction", sample: { artiste: "Etta James", titre: "My Funny Valentine" }, type: "sample" },
  { album: "late-registration", titre: "Drive Slow", sample: { artiste: "Hank Crawford", titre: "Wildflower" }, type: "sample" },
  { album: "late-registration", titre: "Roses", sample: { artiste: "Bill Withers", titre: "Rosie" }, type: "sample" },

  // Graduation
  { album: "graduation", titre: "Stronger", sample: { artiste: "Daft Punk", titre: "Harder, Better, Faster, Stronger", annee: 2001 }, type: "sample" },
  { album: "graduation", titre: "Good Life", sample: { artiste: "Michael Jackson", titre: "P.Y.T. (Pretty Young Thing)", annee: 1983 }, type: "sample" },
  { album: "graduation", titre: "Champion", sample: { artiste: "Steely Dan", titre: "Kid Charlemagne", annee: 1976 }, type: "sample" },
  { album: "graduation", titre: "I Wonder", sample: { artiste: "Labi Siffre", titre: "My Song", annee: 1975 }, type: "sample" },
  { album: "graduation", titre: "Drunk and Hot Girls", sample: { artiste: "Can", titre: "Sing Swan Song", annee: 1972 }, type: "sample" },

  // 808s & Heartbreak
  { album: "808s", titre: "Coldest Winter", sample: { artiste: "Tears for Fears", titre: "Memories Fade", annee: 1983 }, type: "sample" },
  { album: "808s", titre: "Bad News", sample: { artiste: "Nina Simone", titre: "See-Line Woman", annee: 1964 }, type: "sample" },

  // My Beautiful Dark Twisted Fantasy
  { album: "mbdtf", titre: "Dark Fantasy", sample: { artiste: "Mike Oldfield", titre: "In High Places", annee: 1983 }, type: "sample" },
  { album: "mbdtf", titre: "Gorgeous", sample: { artiste: "The Turtles", titre: "You Showed Me", annee: 1969 }, type: "sample" },
  { album: "mbdtf", titre: "Power", sample: { artiste: "King Crimson", titre: "21st Century Schizoid Man", annee: 1969 }, type: "sample" },
  { album: "mbdtf", titre: "Hell of a Life", sample: { artiste: "Black Sabbath", titre: "Iron Man", annee: 1970 }, type: "sample" },
  { album: "mbdtf", titre: "Devil in a New Dress", sample: { artiste: "Smokey Robinson", titre: "Will You Love Me Tomorrow", annee: 1973 }, type: "sample" },
  { album: "mbdtf", titre: "Blame Game", sample: { artiste: "Aphex Twin", titre: "Avril 14th", annee: 2001 }, type: "sample" },
  { album: "mbdtf", titre: "Lost in the World", sample: { artiste: "Bon Iver", titre: "Woods", annee: 2009 }, type: "sample" },
  { album: "mbdtf", titre: "Who Will Survive in America", sample: { artiste: "Gil Scott-Heron", titre: "Comment #1", annee: 1970 }, type: "voix" },

  // Watch the Throne
  { album: "watch-the-throne", titre: "Otis", sample: { artiste: "Otis Redding", titre: "Try a Little Tenderness", annee: 1966 }, type: "sample" },
  { album: "watch-the-throne", titre: "No Church in the Wild", sample: { artiste: "Phil Manzanera", titre: "K-Scope", annee: 1978 }, type: "sample" },
  { album: "watch-the-throne", titre: "Ni**as in Paris", sample: { artiste: "Blades of Glory (film)", titre: "Dialogue du film", annee: 2007 }, type: "voix",
    note: "La phrase parlée de l'intro vient de la comédie Les Rois du patin." },

  // Yeezus
  { album: "yeezus", titre: "On Sight", sample: { artiste: "Holy Name of Mary Choral Family", titre: "He'll Give Us What We Really Need" }, type: "sample" },
  { album: "yeezus", titre: "New Slaves", sample: { artiste: "Omega", titre: "Gyöngyhajú lány", annee: 1969 }, type: "sample",
    note: "Un groupe de rock hongrois, sur l'outro du morceau." },
  { album: "yeezus", titre: "Blood on the Leaves", sample: { artiste: "Nina Simone", titre: "Strange Fruit", annee: 1965 }, type: "sample" },
  { album: "yeezus", titre: "Send It Up", sample: { artiste: "Beenie Man", titre: "Memories" }, type: "sample" },
  { album: "yeezus", titre: "Bound 2", sample: { artiste: "Ponderosa Twins Plus One", titre: "Bound", annee: 1971 }, type: "sample" },

  // The Life of Pablo
  { album: "tlop", titre: "Ultralight Beam", sample: { artiste: "Natalie Green", titre: "Vidéo Instagram (prière)" }, type: "voix",
    note: "La voix d'une petite fille qui prie, tirée d'une vidéo devenue virale." },
  { album: "tlop", titre: "Father Stretch My Hands Pt. 1", sample: { artiste: "Pastor T. L. Barrett", titre: "Father I Stretch My Hands", annee: 1976 }, type: "sample" },
  { album: "tlop", titre: "Famous", sample: { artiste: "Nina Simone", titre: "Do What You Gotta Do", annee: 1968 }, type: "sample",
    note: "Et « Bam Bam » de Sister Nancy (1982) dans la deuxième partie." },
  { album: "tlop", titre: "Freestyle 4", sample: { artiste: "Goldfrapp", titre: "Human", annee: 2000 }, type: "sample" },
  { album: "tlop", titre: "30 Hours", sample: { artiste: "Arthur Russell", titre: "Answers Me", annee: 1986 }, type: "sample" },
  { album: "tlop", titre: "No More Parties in LA", sample: { artiste: "Junie Morrison", titre: "Suzie Thundertussy" }, type: "sample" },
  { album: "tlop", titre: "Fade", sample: { artiste: "Mr. Fingers", titre: "Mystery of Love", annee: 1985 }, type: "sample" },

  // ye
  { album: "ye", titre: "Ghost Town", sample: { artiste: "Shirley Ann Lee", titre: "Someday" }, type: "sample" },

  // Kids See Ghosts
  { album: "ksg", titre: "4th Dimension", sample: { artiste: "Louis Prima", titre: "What Will Santa Claus Say (When He Finds Everybody Swingin')", annee: 1936 }, type: "sample" },
  { album: "ksg", titre: "Cudi Montage", sample: { artiste: "Kurt Cobain", titre: "Burn the Rain" }, type: "sample" },
  { album: "ksg", titre: "Freeee (Ghost Town, Pt. 2)", sample: { artiste: "Marcus Garvey", titre: "Discours (par Ronald Bobb-Semple)" }, type: "voix" },

  // Jesus Is King
  { album: "jik", titre: "Follow God", sample: { artiste: "Whole Truth", titre: "Can You Lose by Following God", annee: 1974 }, type: "sample" },

  // Donda
  { album: "donda", titre: "Believe What I Say", sample: { artiste: "Lauryn Hill", titre: "Doo Wop (That Thing)", annee: 1998 }, type: "sample" },
];
