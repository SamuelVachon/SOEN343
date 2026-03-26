# SOEN343

**SOEN 343 - Winter 2026 Team Project**

| Name | Student ID | GitHub username |
| :--- | :---: | ---: |
| Christopher Tan | 40275695 | christophertna |
| Samuel Vachon | 40281580 | SamuelVachon |
| Gavin Chock-Chiong | 40278642 | Grvin388 |
| Valerie Nguyen | 40284261 | valerie-nguyen |
| Gregory Lajoie | 40276231 | grylajoie |


**Project Description:**

This project asks students to develop a modern prototype urban transportation application. For a duration of around 10 weeks, students will go through 4 sprints to develop the prototype application, using mainly GitHub for project management and development. The application prototype is a conceptual, integrated digital platform designed to coordinate and optimize multiple urban mobility services within a smart city environment. The application aims to improve transportation efficiency, reduce congestion, and enhance the overall mobility experience for citizens by unifying shared mobility services, parking infrastructure, and public transportation into a single, intelligent management system.



**Features:**
+ Authentication Service: Firebase Auth manages user sessions and specific signup/logins.
+ Transit Integration Service: Fetches, parses and caches real-time data from public transportation service providers.
+ Micromobility & Parking Service: Connects to BIXI and parking sensor APIs, providing live availability, vehicle status and rental status.
+ CarbonIQ Calculation Engine: Specialized service that applies a standardized environmental algorithm that determines the CO2 impact of routes depending on distance and mode.
+ Analytics & Admin Dashboard: Processes historical and real-time data to generate sustainability reports, more detailed reports for admins.



**Users:**
+ Citizens and commuters who use shared vehicles, parking facilities, and public transport
+ Mobility service providers, such as bike-sharing, car-sharing, and scooter operators
+ Public transportation operators managing buses, metros, or trams
+ City administrators responsible for urban mobility planning and regulation
+ System administrators who manage and maintain the platform.




**Installation Guide:**

+ run in the terminal:
```bash
cd routeraboniq
npm install
npm i firebase firebaseui
```


**How to run:**
+ run in the terminal:
```bash
npm run dev
```


