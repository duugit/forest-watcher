# Forest Watcher

Create a clean, modern web application dashboard tailored for a university thesis titled "A real-time AI-powered deforestation detection system using satellite imagery for Myanmar". 

UI Architecture Requirements:

1. Header: Display the thesis title in a bold, academic font. Add a status badge that says "System Status: Connected to GEE Cloud Engine".

2. Left Sidebar (Control Input Panel):

   - A drop-down menu to select Myanmar townships/regions: "Sagaing (Katha District)", "Tanintharyi (Dawei)", "Shan State (Taunggyi)".

   - A date picker input field explicitly labeled "Select Previous Comparison Map" (default date set to May 12, 2012).

   - A non-editable card labeled "Current Comparison Map" (hardcoded to Present Day Today).

   - A large green "Execute AI Classification Engine" trigger button.

3. Central Stage (The Comparison Map):

   - Embed an interactive Maplibre GL map layout.

   - Implement a functional, draggable vertical split-screen slider bar down the absolute center of the map canvas. 

   - The Left Side of the slider represents the "Past Data View". The Right Side represents the "Present Data View".

   - Include a toggle switch at the top of the map to flip between "Raw Satellite Real View" and "AI Color-Coded Classification View".

4. Right Sidebar (Analytics & Metrics Panel):

   - A main KPI display card showcasing "Total Forest Loss: X Hectares" and "Total Forest Gain: Y Hectares".

   - A clean horizontal bar chart displaying a square-kilometer breakdown of our 6 target classes. The color keys must match exactly: Dense Forest (Deep Green, #0B5345), Forest (Medium Green, #1E8449), Grass/Vegetation (Light Green/Yellow, #7DCEA0), Water (Blue, #2E86C1), Non-Forest Ground/Bare Soil (Brown, #A04000).

Mock the backend data responses completely for now so it runs smoothly without a real server. Clicking the "Execute AI Classification" button should trigger a loading spinner animation, change the layout metrics to show dummy numbers, and update the bar charts seamlessly.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ed351bb1-085d-4a43-a582-b1c8d0243c83).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
