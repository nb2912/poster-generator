'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; 
import { Type, Download, Palette, Sparkles, Loader2, Trash2 } from 'lucide-react';

// Standard web fonts to choose from
const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 
  'Verdana', 'Georgia', 'Impact', 'Comic Sans MS'
];

const PosterCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [bgColor, setBgColor] = useState('#ffffff'); 
  
  // AI States
  const [story, setStory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [building, setBuilding] = useState('Main Building');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  // Text Styling States
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [textConfig, setTextConfig] = useState({
    color: '#333333',
    fontSize: 30,
    fontFamily: 'Arial'
  });

  const TEMPLATE_WIDTH = 500;
  const TEMPLATE_HEIGHT = 700;

  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      height: TEMPLATE_HEIGHT,
      width: TEMPLATE_WIDTH,
      backgroundColor: bgColor,
    });

    setCanvas(initCanvas);

    // --- SELECTION EVENTS ---
    const updateSelection = () => {
        const activeObject = initCanvas.getActiveObject();
        setSelectedObject(activeObject || null);

        if (activeObject && activeObject.type === 'i-text') {
            const textObj = activeObject as fabric.IText;
            // Safer color handling
            const safeColor = (typeof textObj.fill === 'string') ? textObj.fill : '#333333';
            
            setTextConfig({
                color: safeColor,
                fontSize: textObj.fontSize || 30,
                fontFamily: textObj.fontFamily || 'Arial'
            });
        }
    };

    initCanvas.on('selection:created', updateSelection);
    initCanvas.on('selection:updated', updateSelection);
    initCanvas.on('selection:cleared', () => setSelectedObject(null));

    // --- LOAD ASSETS ---
    
    // 1. Logo (Fixed Top-Left)
    fabric.Image.fromURL('/logo.png').then((logo: fabric.Image) => {
        logo.scaleToWidth(80); 
        logo.set({ left: 30, top: 30, selectable: false, evented: false });
        initCanvas.add(logo);
    });



    return () => {
      initCanvas.dispose();
    };
  }, []);

  // --- HANDLERS ---

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBgColor(e.target.value);
    if (canvas) {
      canvas.backgroundColor = e.target.value;
      canvas.renderAll();
    }
  };

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setTextConfig(prev => ({ ...prev, color }));
    
    if (canvas) {
        const activeObj = canvas.getActiveObject() as fabric.IText;
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set({ fill: color });
            canvas.renderAll();
        }
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    setTextConfig(prev => ({ ...prev, fontSize: size }));

    if (canvas) {
        const activeObj = canvas.getActiveObject() as fabric.IText;
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set({ fontSize: size });
            canvas.renderAll();
        }
    }
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const font = e.target.value;
    setTextConfig(prev => ({ ...prev, fontFamily: font }));

    if (canvas) {
        const activeObj = canvas.getActiveObject() as fabric.IText;
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set({ fontFamily: font });
            canvas.renderAll();
        }
    }
  };

  const deleteSelected = () => {
    if (canvas) {
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            canvas.remove(activeObj);
            canvas.discardActiveObject();
            canvas.renderAll();
            setSelectedObject(null);
        }
    }
  }

  const addText = () => {
    if (canvas) {
      const text = new fabric.IText('Edit Me', {
        left: TEMPLATE_WIDTH / 2, top: TEMPLATE_HEIGHT / 2,
        originX: 'center', originY: 'center',
        fontFamily: 'Arial', fontSize: 32, fill: '#333333',
        fontWeight: 'bold',
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      setSelectedObject(text);
      setTextConfig({ color: '#333333', fontSize: 32, fontFamily: 'Arial' });
    }
  };

  const generateAiImage = async () => {
    if (!story || !imageFile) return;
    setIsGenerating(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBase64 = (reader.result as string).split(',')[1];
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64, story, building }),
        });
        const data = await res.json();
        if (data.image && canvas) {
          fabric.Image.fromURL(data.image).then((img) => {
              img.scaleToWidth(400);
              img.set({ left: TEMPLATE_WIDTH/2, top: TEMPLATE_HEIGHT/2, originX:'center', originY:'center' });
              canvas.add(img);
              canvas.setActiveObject(img);
          });
          setStory('');
          setImageFile(null);
          setBuilding('Main Building');
          setShowAiInput(false);
        } else {
          alert("Error: " + (data.error || "Failed"));
        }
      };
      reader.readAsDataURL(imageFile);
    } catch (error) {
      alert("Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPoster = () => {
    if (canvas) {
        const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const link = document.createElement('a');
        link.download = 'poster.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8 justify-center items-start min-h-screen bg-gray-50 font-sans">
      
      {/* SIDEBAR */}
      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-5 w-full md:w-80 border border-gray-100">
        <h3 className="font-bold text-gray-800 text-lg">Poster Studio</h3>

        {/* Global Background */}
        {!selectedObject && (
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Background
                </label>
                <div className="flex items-center gap-3 border p-2 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="color" value={bgColor} onChange={handleBgColorChange} className="w-8 h-8 cursor-pointer bg-transparent border-none"/>
                    <span className="text-gray-500 text-sm uppercase">{bgColor}</span>
                </div>
            </div>
        )}

        {/* TEXT EDITOR */}
        {selectedObject && selectedObject.type === 'i-text' && (
            <div className="flex flex-col gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Text Options</span>
                    <button onClick={deleteSelected} className="text-red-500 hover:bg-red-100 p-1 rounded">
                        <Trash2 size={16}/>
                    </button>
                </div>
                
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Font Family</label>
                    <select 
                        value={textConfig.fontFamily} 
                        onChange={handleFontFamilyChange}
                        className="w-full p-2 text-sm border border-gray-300 rounded bg-white text-gray-800 focus:outline-none focus:border-blue-500"
                    >
                        {FONT_FAMILIES.map(font => (
                            <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Color</label>
                        <div className="flex items-center h-9 border border-gray-300 rounded bg-white px-2">
                            <input type="color" value={textConfig.color} onChange={handleTextColorChange} className="w-full h-6 cursor-pointer bg-transparent border-none"/>
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Size</label>
                        <input type="number" min="10" max="200" value={textConfig.fontSize} onChange={handleFontSizeChange} className="w-full p-2 h-9 text-sm border border-gray-300 rounded text-gray-800"/>
                    </div>
                </div>
            </div>
        )}

        <hr className="border-gray-100" />

        {/* AI Section */}
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <button onClick={() => setShowAiInput(!showAiInput)} className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-2 hover:underline">
                <Sparkles size={16} /> Generate Alumni Poster with Gemini
            </button>
            {showAiInput && (
                <div className="flex flex-col gap-2">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Upload Your Photo</label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
                            className="w-full p-2 text-sm text-gray-900 bg-white border border-indigo-200 rounded focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Memorable Story</label>
                        <textarea 
                            className="w-full p-2 text-sm text-gray-900 bg-white border border-indigo-200 rounded focus:outline-none"
                            placeholder="Share your memorable story from college..." rows={3} value={story} onChange={(e) => setStory(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">SRM Building</label>
                        <select 
                            value={building} 
                            onChange={(e) => setBuilding(e.target.value)}
                            className="w-full p-2 text-sm border border-indigo-200 rounded bg-white text-gray-800 focus:outline-none"
                        >
                            <option>Main Building</option>
                            <option>Tech Park</option>
                            <option>Library</option>
                            <option>Auditorium</option>
                            <option>Hostel</option>
                        </select>
                    </div>
                    <button onClick={generateAiImage} disabled={isGenerating || !story || !imageFile} className="bg-indigo-600 text-white text-xs font-bold py-2 rounded hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2">
                        {isGenerating ? <Loader2 className="animate-spin" size={14}/> : 'Generate Poster'}
                    </button>
                </div>
            )}
        </div>

        <button onClick={addText} className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition font-medium">
          <Type size={18} /> Add Text
        </button>

        <button onClick={downloadPoster} className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition mt-auto">
          <Download size={18} /> Download
        </button>
      </div>

      <div className="border border-gray-200 shadow-2xl bg-white rounded-sm overflow-hidden">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default PosterCanvas;