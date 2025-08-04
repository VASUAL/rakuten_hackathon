Intelligent Disaster Prep List & Evacuation Map
This is an intelligent disaster preparedness application designed for a Rakuten programming hackathon. The project aims to solve the critical problem of individuals and families not knowing how to effectively prepare for or react to natural disasters. This application provides a one-stop, personalized disaster preparedness solution by combining advanced AI, the Rakuten ecosystem of APIs, and public government data.

Core Features
AI-Powered Product Recommendations:

Users provide detailed family information (number of adults, children, infants, elderly, and pets) during a seamless registration process.

The application leverages the Google Gemini API to intelligently generate a highly personalized list of keywords for essential disaster supplies.

Utilizing the Rakuten Ichiba API, the app performs parallel searches for these keywords to find real, purchasable products, which are then displayed in a clean, categorized format.

Recommendation results are cached in the database per user and family composition, ensuring near-instant loading times on subsequent logins and conserving API resources.

Multi-Source Evacuation Map:

Users can input their home address to view their location on an interactive map.

The map fetches and displays nearby hotels from the Rakuten Travel API, which can serve as potential wide-area evacuation shelters.

It also integrates localized public open data (JSON/CSV) to display nearby supermarkets, government agencies, and official designated evacuation shelters.

A dynamic filtering system allows users to toggle the visibility of different location types (hotels, shelters, etc.) on both the map and in the lists.

Knowledge Center & Quiz:

Book Recommendations: The app calls the Rakuten Kobo API to recommend top-selling eBooks on disaster prevention and self-rescue.

AI-Powered Quiz: The Google Gemini API dynamically generates a 5-question multiple-choice quiz on Japanese disaster preparedness knowledge. The system grades the answers, records the results, and rewards the user with simulated Rakuten Points.

Full User Authentication System:

Supports user registration and login, with passwords securely hashed using bcrypt.

Session management and API authentication are handled via JWT (JSON Web Token).

All core features are protected and require user login, ensuring data privacy.

Technology Stack
Frontend:

Framework: Vue 3 (Composition API)

UI Library: Element Plus

Routing: Vue Router

HTTP Client: Axios

Mapping: Leaflet & Vue-Leaflet

Backend:

Runtime: Node.js

Framework: Express

Database: SQLite

Authentication: bcrypt (password hashing), jsonwebtoken (JWT)

External APIs & Data Sources:

Google Gemini API: For intelligent keyword and quiz generation.

Rakuten APIs:

Rakuten Ichiba API (Product Search)

Rakuten Travel API (Hotel Search)

Rakuten Kobo API (eBook Search)

Geospatial Information Authority of Japan (GSI) API: For address geocoding.

Government Open Data: For localized data such as designated evacuation shelters in Nagoya City.

Setup and Installation
Prerequisites:

Node.js (v18 or higher recommended)

npm or another package manager