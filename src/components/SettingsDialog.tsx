import React, { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/Input';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

const STORAGE_KEY = 'settings';

interface Settings {
  openExchangeKey: string;
  goldApiKey: string;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [openExchangeKey, setOpenExchangeKey] = useState('');
  const [goldApiKey, setGoldApiKey] = useState('');

  useEffect(() => {
    // Load existing API keys from localStorage
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      const settings: Settings = JSON.parse(storedSettings);
      setOpenExchangeKey(settings.openExchangeKey || '');
      setGoldApiKey(settings.goldApiKey || '');
    }
  }, []);

  const handleSave = () => {
    try {
      // Save API keys to localStorage
      const settings: Settings = {
        openExchangeKey,
        goldApiKey,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      onClose();
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="openexchange">OpenExchange API Key</Label>
            <Input
              id="openexchange"
              type="text"
              value={openExchangeKey}
              onChange={(e) => setOpenExchangeKey(e.target.value)}
              placeholder="Enter OpenExchange API key"
            />
            <a
              href="https://openexchangerates.org/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline"
            >
              Register for OpenExchange API key
            </a>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goldapi">Gold API Key</Label>
            <Input
              id="goldapi"
              type="text"
              value={goldApiKey}
              onChange={(e) => setGoldApiKey(e.target.value)}
              placeholder="Enter Gold API key"
            />
            <a
              href="https://www.goldapi.io/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline"
            >
              Register for Gold API key
            </a>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 