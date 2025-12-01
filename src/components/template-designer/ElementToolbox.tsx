"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Type,
  Image as ImageIcon,
  Square,
  Minus,
  Table as TableIcon,
  FilePlus,
} from 'lucide-react';
import type { TemplateElement } from '@/types/template-designer';
import { createElement } from '@/types/template-designer';

interface ElementToolboxProps {
  onAddElement: (element: TemplateElement) => void;
}

export function ElementToolbox({ onAddElement }: ElementToolboxProps) {
  const handleAddElement = (type: TemplateElement['type']) => {
    const element = createElement(type);

    // Position new elements at a default location
    element.x = 50;
    element.y = 50;

    // Set reasonable default sizes
    switch (type) {
      case 'text':
        element.width = 200;
        element.height = 40;
        break;
      case 'image':
        element.width = 150;
        element.height = 150;
        break;
      case 'rectangle':
        element.width = 200;
        element.height = 100;
        break;
      case 'line':
        element.width = 200;
        element.height = 0;
        break;
      case 'table':
        element.width = 400;
        element.height = 200;
        break;
    }

    onAddElement(element);
  };

  const elements = [
    {
      type: 'text' as const,
      icon: Type,
      label: 'Text',
      description: 'Add text with data binding',
    },
    {
      type: 'image' as const,
      icon: ImageIcon,
      label: 'Image',
      description: 'Add logo or image',
    },
    {
      type: 'table' as const,
      icon: TableIcon,
      label: 'Table',
      description: 'Add data table',
    },
    {
      type: 'rectangle' as const,
      icon: Square,
      label: 'Rectangle',
      description: 'Add shape',
    },
    {
      type: 'line' as const,
      icon: Minus,
      label: 'Line',
      description: 'Add divider',
    },
    {
      type: 'pageBreak' as const,
      icon: FilePlus,
      label: 'Page Break',
      description: 'Add page break',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Elements</h3>
        <p className="text-xs text-muted-foreground">
          Click to add elements to your template
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        {elements.map((element) => {
          const Icon = element.icon;
          return (
            <Card
              key={element.type}
              className="p-3 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleAddElement(element.type)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{element.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {element.description}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
          Quick Tips
        </h4>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>• Click elements to add them to canvas</p>
          <p>• Drag to move, resize handles to scale</p>
          <p>• Delete key to remove selected element</p>
          <p>• Use data binding syntax: {'{'}{'{'} fieldName {'}'}{'}'}</p>
        </div>
      </div>
    </div>
  );
}
