'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; 
import { Type, Download, Palette } from 'lucide-react';

const PosterCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [bgColor, setBgColor] = useState('#ffffff'); 

  // Define your poster dimensions (e.g., A4 ratio)
  const TEMPLATE_WIDTH = 500;
  const TEMPLATE_HEIGHT = 700;

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Initialize Canvas
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      height: TEMPLATE_HEIGHT,
      width: TEMPLATE_WIDTH,
      backgroundColor: bgColor,
    });

    setCanvas(initCanvas);

    // ---------------------------------------------------------
    // 2. ADD FIXED COMPANY LOGO (Top Left)
    // ---------------------------------------------------------
    // Make sure you have a 'logo.png' in your public folder
    fabric.Image.fromURL('/logo.png').then((logo: fabric.Image) => {
        // Resize logo (e.g., 80px width)
        logo.scaleToWidth(80); 

        logo.set({
            left: 30,  // Padding from left
            top: 30,   // Padding from top
            selectable: false, // User cannot select it
            evented: false,    // User clicks "pass through" it
            hoverCursor: 'default',
        });

        initCanvas.add(logo);
        // We render immediately to show the logo
        initCanvas.renderAll();
    });

    // ---------------------------------------------------------
    // 3. ADD TEMPLATE OVERLAY (The Frame)
    // ---------------------------------------------------------
    // Make sure 'template.png' has transparency!
    fabric.Image.fromURL('/template.png').then((img: fabric.Image) => {
      img.scaleToWidth(TEMPLATE_WIDTH);
      img.scaleToHeight(TEMPLATE_HEIGHT);
      
      // Set overlayImage to ensure this image is ALWAYS on top of everything
      // including the logo and user text.
      initCanvas.overlayImage = img;
      initCanvas.renderAll();
    });

    return () => {
      initCanvas.dispose();
    };
  }, []); // Empty dependency array = runs once on mount

  
  // --- HELPERS ---

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setBgColor(newColor);

    if (canvas) {
      canvas.backgroundColor = newColor;
      canvas.renderAll();
    }
  };

  const addText = () => {
    if (canvas) {
      const text = new fabric.IText('Edit Me', {
        left: TEMPLATE_WIDTH / 2,
        top: TEMPLATE_HEIGHT / 2,
        originX: 'center',
        originY: 'center',
        fontFamily: 'sans-serif',
        fontSize: 32,
        fill: '#333',
        fontWeight: 'bold',
      });
      canvas.add(text);
      canvas.setActiveObject(text);
    }
  };

  const downloadPoster = () => {
    if (canvas) {
        // Export to high-quality PNG
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2 // 2x Resolution
        });
        
        const link = document.createElement('a');
        link.download = 'custom-poster.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8 justify-center items-start min-h-screen bg-gray-50">
      
      {/* --- LEFT SIDEBAR: CONTROLS --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-5 w-full md:w-72 border border-gray-100">
        <h3 className="font-bold text-gray-800 text-lg">Poster Studio</h3>
        
        {/* Color Picker */}
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Palette size={16} /> Background Color
            </label>
            <div className="flex items-center gap-3 border p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input 
                    type="color" 
                    value={bgColor}
                    onChange={handleColorChange}
                    className="w-10 h-10 border-none cursor-pointer bg-transparent rounded-md overflow-hidden"
                />
                <span className="text-gray-500 text-sm uppercase font-mono">{bgColor}</span>
            </div>
        </div>

        <hr className="border-gray-100" />

        {/* Action Buttons */}
        <button 
          onClick={addText}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
        >
          <Type size={18} />
          Add Text
        </button>

        <button 
          onClick={downloadPoster}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition mt-auto shadow-sm"
        >
          <Download size={18} />
          Download
        </button>

        <p className="text-xs text-center text-gray-400 mt-2">
            *Logo and Frame are fixed.
        </p>
      </div>

      {/* --- RIGHT SIDE: CANVAS --- */}
      <div className="border border-gray-200 shadow-2xl bg-white rounded-sm overflow-hidden">
        <canvas ref={canvasRef} />
      </div>

    </div>
  );
};

export default PosterCanvas;