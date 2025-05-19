# Tiled Map Integration Guide for Phraipets

This guide will walk you through creating a clickable world map for the Phraipets game using Tiled Map Editor.

## Step 1: Setup in Tiled

1. Download and install [Tiled Map Editor](https://www.mapeditor.org/) if you haven't already.

2. Create a new map:
   - File > New > New Map
   - Orientation: Orthogonal
   - Tile layer format: CSV
   - Tile render order: Right Down
   - Map size: Width and height to match your world map image (e.g., 1600x1200 pixels)
   - Tile size: 32x32 pixels (this is arbitrary but works well for positioning)

3. Add your world map as an image layer:
   - In the Layers panel, right-click and select "Add Image Layer"
   - Name it "Background"
   - Click the "..." button to select your world map image
   - Position: 0, 0

4. Create an object layer for clickable locations:
   - In the Layers panel, right-click and select "Add Object Layer"
   - Name it "Hotspots" (this exact name is required for the code to recognize it)

## Step 2: Adding Clickable Locations

1. Select the "Hotspots" layer.

2. Use the Rectangle tool (R) or Polygon tool (P) to draw areas around your map locations.
   - For Sunnybrook, draw a rectangle/polygon over the Sunnybrook icon on your map

3. With your new object selected, set these properties in the Properties panel:
   - Name: "Sunnybrook" (display name)
   - Type: "location" (optional categorization)

4. Add custom properties by clicking the "+" in the Properties panel:
   - id_string: "sunnybrook-village" (unique identifier)
   - route: "/explore/sunnybrook" (navigation path in your app)
   - iconSrc: "/maps/icons/sunnybrook_icon.png" (path to icon image)
   - iconSize: 64 (size of icon in pixels)
   - radius: 40 (clickable radius in pixels, optional)

5. Repeat this process for each location on your map.

## Step 3: Export Your Map

1. Save your Tiled project file:
   - File > Save As
   - Save with a .tmx extension (e.g., "world_map.tmx")

2. Export as JSON:
   - File > Export As
   - Select JSON format (.json)
   - Save as "world_map_data.json" in your project's "public/maps/" directory

## Step 4: Add Map Images

1. Save your world map image as "world_map_background.png" in "public/maps/"

2. Create an "icons" folder in "public/maps/" and add your location icons:
   - "sunnybrook_icon.png"
   - etc.

## Step 5: Verify Your JSON Structure

Your exported JSON should have this general structure:

```json
{
  "version": "1.10.2",
  "tiledversion": "1.10.2",
  "orientation": "orthogonal",
  "width": 50,
  "height": 37,
  "layers": [
    {
      "name": "Background",
      "type": "imagelayer",
      "image": "world_map_background.png"
    },
    {
      "name": "Hotspots",
      "type": "objectgroup",
      "objects": [
        {
          "name": "Sunnybrook",
          "type": "location",
          "x": 800,
          "y": 600,
          "width": 100,
          "height": 100,
          "properties": [
            { "name": "id_string", "type": "string", "value": "sunnybrook-village" },
            { "name": "route", "type": "string", "value": "/explore/sunnybrook" },
            { "name": "iconSrc", "type": "string", "value": "/maps/icons/sunnybrook_icon.png" },
            { "name": "iconSize", "type": "int", "value": 64 },
            { "name": "radius", "type": "int", "value": 40 }
          ]
        }
      ]
    }
  ]
}
```

## Required Properties for Each Location

For each location in your "Hotspots" layer, include these properties:

| Property  | Type   | Description                                  | Example                          |
|-----------|--------|----------------------------------------------|----------------------------------|
| id_string | string | Unique identifier                            | "sunnybrook-village"             |
| route     | string | Navigation route in your app                 | "/explore/sunnybrook"            |
| iconSrc   | string | Path to location icon                        | "/maps/icons/sunnybrook_icon.png"|
| iconSize  | int    | Size of icon in pixels                       | 64                               |
| radius    | int    | (Optional) Clickable radius around the point | 40                               |

## Compatibility with Your Code

Your Explore.tsx file is already set up to load and process the Tiled map data. It looks for:

1. A background image at `/maps/world_map_background.png`
2. Map data at `/maps/world_map_data.json`
3. A layer named "Hotspots" with objects containing the properties listed above

As long as you follow this structure, your map should work with the existing code! 