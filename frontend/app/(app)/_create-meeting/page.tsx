'use client';
import { API_URL } from "@/lib/config"
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Link, Users, Sparkles, Copy, Check,
  Lock, Globe, Settings, Shield, Video, Bell,
  User, Zap, BarChart, Eye, EyeOff, Mic, MicOff, VideoIcon, VideoOff, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateMeetingPage() {
  const router = useRouter();
  const [meetingName, setMeetingName] = useState('Team Meeting');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // Meeting settings
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(0);
  const [autoRecord, setAutoRecord] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(false);

  // User info
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  // Device selectors & preview
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/check`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setUserName(data.user_name || data.user_email?.split('@')[0] || 'User');
            setUserId(data.user_id);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Enumerate devices and start camera preview when popup opens
  useEffect(() => {
    if (!meetingUrl) {
      // Cleanup preview when popup closes
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop());
        previewStreamRef.current = null;
      }
      return;
    }

    const setupDevices = async () => {
      try {
        // Need to get a stream first to trigger permission prompt & populate device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        previewStreamRef.current = stream;

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);

        if (audioInputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        if (videoInputs.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
        toast.error('Camera/mic access denied');
      }
    };

    setupDevices();

    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop());
        previewStreamRef.current = null;
      }
    };
  }, [meetingUrl]);

  // Switch camera when device selection changes
  useEffect(() => {
    if (!meetingUrl || !selectedVideoDevice) return;

    const switchCamera = async () => {
      try {
        // Stop old video tracks
        if (previewStreamRef.current) {
          previewStreamRef.current.getVideoTracks().forEach(t => t.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedVideoDevice } },
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        });

        previewStreamRef.current = newStream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error('Failed to switch camera:', err);
      }
    };

    switchCamera();
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Toggle camera preview on/off
  useEffect(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = isCameraOn;
      });
    }
  }, [isCameraOn]);

  // Toggle mic on/off
  useEffect(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = isMicOn;
      });
    }
  }, [isMicOn]);

  const createMeeting = async () => {
    if (!meetingName.trim()) {
      setError('Please enter a meeting name');
      return;
    }
    if (!isPublic && !password.trim()) {
      setError('Please enter a password for private meetings');
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please login first');

      const response = await fetch(
        `${API_URL}/api/meeting-rooms/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: meetingName,
            isPublic,
            password: password || undefined,
            settings: {
              allow_screen_share: true,
              allow_chat: true,
              allow_recording: true,
              max_participants: maxParticipants,
              require_approval: requireApproval,
              auto_record: autoRecord,
              translation_enabled: translationEnabled
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create meeting');
      }

      const data = await response.json();
      // Backend returns { room_id, title, auto_record, created_by, created_at }
      const newMeetingId = data.room_id;
      if (!newMeetingId) throw new Error('No room_id returned from API');

      const newMeetingUrl = `${window.location.origin}/meeting/${newMeetingId}`;
      setMeetingId(newMeetingId);
      setMeetingUrl(newMeetingUrl);
      toast.success('Meeting created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting');
      toast.error(err.message || 'Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Meeting link copied!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const joinMeeting = () => {
    // Cleanup preview stream before navigating
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    }
    if (meetingId) {
      router.push(`/meeting/${meetingId}?mic=${isMicOn}&cam=${isCameraOn}`);
    }
  };

  const closePopup = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    }
    setMeetingUrl('');
    setMeetingId('');
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-foreground)',
        background: 'var(--canvas)'
      }}
    >
      <main className="relative pt-8 lg:pt-10 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background effects */}

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="display-lg mb-4">
                Start a <span className="font-accent text-brand-light">meeting</span>
              </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Set up a room, then share the link with whoever's joining.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* Main Form Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="flex-1 w-full"
            >
              <Card
                className="border-line relative overflow-hidden group hover:border-primary/40 transition-all duration-700"
                style={{
                  backgroundColor: 'var(--panel-3)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                }}
              >
                {/* Animated Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 tile-accent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                <CardHeader className="pb-8">
                  <CardTitle className="text-3xl font-bold flex items-center gap-4">
                    <Settings className="w-8 h-8 text-primary" />
                    Room Configuration
                  </CardTitle>
                  <p className="text-gray-400">Customize privacy, features, and access controls</p>
                </CardHeader>

                <CardContent className="space-y-8">
                  {/* Meeting Name */}
                  <div className="space-y-3">
                    <Label htmlFor="meeting-name" className="text-lg font-medium text-gray-200 ml-1">
                      Meeting Name
                    </Label>
                    <Input
                      id="meeting-name"
                      placeholder="Enter meeting name"
                      value={meetingName}
                      onChange={(e) => setMeetingName(e.target.value)}
                      className="bg-white/5 border-line h-14 text-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all rounded-xl"
                      disabled={isCreating || !!meetingUrl}
                    />
                  </div>

                  {/* Privacy Toggle */}
                  <div className="p-6 rounded-2xl bg-white/5 border border-line hover:border-primary/30 transition-all duration-300 group/item">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-xl ${isPublic ? 'bg-blue-500/20' : 'bg-purple-500/20'} transition-all duration-500`}>
                          {isPublic ? <Globe className="w-8 h-8 text-blue-400" /> : <Lock className="w-8 h-8 text-purple-400" />}
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold">{isPublic ? 'Public Meeting' : 'Private Meeting'}</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {isPublic ? 'Anyone with the link can join instantly' : 'Password required for entry'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                        disabled={isCreating || !!meetingUrl}
                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-600 scale-125"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <AnimatePresence>
                    {!isPublic && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.4 }}
                        className="overflow-hidden"
                      >
                        <Label htmlFor="password" className="text-lg font-medium text-gray-200 ml-1">
                          Meeting Password
                        </Label>
                        <div className="relative mt-3">
                          <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter strong password (min 6 chars)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-line pl-12 pr-14 h-14 text-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all rounded-xl"
                            disabled={isCreating || !!meetingUrl}
                          />
                          <motion.button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            whileHover={{ scale: 1.2, color: '#fff' }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors bg-transparent border-none p-1 z-10"
                          >
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={showPassword ? 'eye-off' : 'eye'}
                                initial={{ opacity: 0, rotate: -30 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 30 }}
                                transition={{ duration: 0.2 }}
                              >
                                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                              </motion.div>
                            </AnimatePresence>
                          </motion.button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 ml-1">Participants will need this to join</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Feature Toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { label: 'Require Host Approval', icon: User, state: requireApproval, setState: setRequireApproval },
                      { label: 'Auto Recording', icon: Video, state: autoRecord, setState: setAutoRecord },
                      { label: 'Live AI Translation', icon: Globe, state: translationEnabled, setState: setTranslationEnabled },
                    ].map((feature) => (
                      <motion.div
                        key={feature.label}
                        whileHover={{ scale: 1.03 }}
                        className="p-5 rounded-xl bg-white/5 border border-line hover:border-primary/30 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <feature.icon className="w-6 h-6 text-accent" />
                            <span className="font-medium">{feature.label}</span>
                          </div>
                          <Switch
                            checked={feature.state}
                            onCheckedChange={feature.setState}
                            disabled={isCreating || !!meetingUrl}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-600"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Create Button */}
                  {!meetingUrl && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative group/btn overflow-hidden rounded-2xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover/btn:animate-shine pointer-events-none" />
                      <Button
                        onClick={createMeeting}
                        disabled={isCreating}
                        className="btn-primary h-12 w-full text-base"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="animate-spin" />
                            Creating your room...
                          </>
                        ) : (
                          <>
                            Create meeting
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}

                  {error && (
                    <Alert
                      className="border-red-500/30 text-red-300"
                      style={{
                        backgroundColor: 'rgba(var(--danger-rgb), 0.1)',
                      }}
                    >
                      <Shield className="w-5 h-5" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Pre-Join Popup with Camera Preview & Device Selectors */}
            <AnimatePresence>
              {meetingUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closePopup}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 100 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 100 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.1 }}
                    className="relative w-full max-w-3xl rounded-2xl p-8 overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      background: `
                        radial-gradient(ellipse at top left, rgba(var(--brand-rgb), 0.12) 0%, transparent 50%),
                        radial-gradient(ellipse at top right, rgba(var(--sand-rgb), 0.12) 0%, transparent 50%),
                        radial-gradient(ellipse at bottom, rgba(var(--brand-rgb), 0.12) 0%, transparent 50%),
                        var(--panel)
                      `,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    {/* Close button */}
                    <button
                      onClick={closePopup}
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-gray-400 hover:text-white z-10"
                    >
                      <X size={20} />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="w-16 h-16 bg-blue-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-4"
                      >
                        <Check className="w-8 h-8 text-white" />
                      </motion.div>
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Ready to <span className="text-blue-400">Join</span>
                      </h3>
                      <p className="text-gray-400 mt-1 text-sm">Check your camera and microphone before joining</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Camera Preview */}
                      <div className="space-y-4">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-line">
                          <video
                            ref={previewVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
                            style={{ transform: 'scaleX(-1)' }}
                          />
                          {!isCameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                                <span className="text-3xl font-bold text-gray-400">
                                  {userName ? userName[0].toUpperCase() : 'U'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mic & Camera Toggles */}
                        <div className="flex justify-center items-center gap-4">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMicOn
                              ? 'bg-gray-800 hover:bg-gray-700'
                              : 'bg-red-500 hover:bg-red-600'
                              }`}
                          >
                            {isMicOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCameraOn(!isCameraOn)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOn
                              ? 'bg-gray-800 hover:bg-gray-700'
                              : 'bg-red-500 hover:bg-red-600'
                              }`}
                          >
                            {isCameraOn ? <VideoIcon className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
                          </motion.button>
                        </div>
                      </div>

                      {/* Settings side */}
                      <div className="space-y-4">
                        {/* Microphone Selector */}
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <Mic size={14} /> Microphone
                          </Label>
                          <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                            <SelectTrigger className="bg-white/5 border-line h-11 text-sm rounded-xl">
                              <SelectValue placeholder="Select microphone" />
                            </SelectTrigger>
                            <SelectContent className="bg-panel border-line text-white z-[110]">
                              {audioDevices.map(d => (
                                <SelectItem key={d.deviceId} value={d.deviceId}>
                                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Camera Selector */}
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <VideoIcon size={14} /> Camera
                          </Label>
                          <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                            <SelectTrigger className="bg-white/5 border-line h-11 text-sm rounded-xl">
                              <SelectValue placeholder="Select camera" />
                            </SelectTrigger>
                            <SelectContent className="bg-panel border-line text-white z-[110]">
                              {videoDevices.map(d => (
                                <SelectItem key={d.deviceId} value={d.deviceId}>
                                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Meeting Link */}
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <Link size={14} /> Meeting Link
                          </Label>
                          <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl border border-line">
                            <Input
                              value={meetingUrl}
                              readOnly
                              className="bg-transparent border-none h-9 font-mono text-xs text-gray-300 pointer-events-none"
                            />
                            <Button
                              onClick={copyToClipboard}
                              size="sm"
                              className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all flex-shrink-0"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 pt-2">
                          <Button
                            onClick={joinMeeting}
                            size="lg"
                            className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg"
                          >
                            Join Meeting
                          </Button>
                          <Button
                            onClick={closePopup}
                            variant="outline"
                            size="sm"
                            className="w-full h-10 border-line hover:bg-white/5 text-gray-400 rounded-xl text-sm font-semibold"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Sidebar Content */}
            <div className="w-full lg:w-96 space-y-8">
              {/* Host Profile */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative group/host overflow-hidden rounded-3xl p-[1px] mb-4"
              >
                <div className="absolute inset-0 tile-accent animate-spin-slow opacity-0 group-hover/host:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div
                  className="relative flex items-center gap-5 p-4 rounded-[23px] backdrop-blur-xl border border-line group-hover/host:border-transparent transition-all"
                  style={{
                    backgroundColor: 'var(--panel-2)',
                  }}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl tile-accent p-0.5 shadow-xl shadow-primary/20 group-hover/host:scale-105 transition-transform duration-500">
                      <div
                        className="w-full h-full rounded-[0.9rem] flex items-center justify-center text-xl font-black text-white"
                        style={{
                          backgroundColor: 'var(--panel-3)',
                        }}
                      >
                        {userName ? userName[0].toUpperCase() : 'U'}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-gray-900 shadow-xl" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white tracking-tight">{userName || 'Active User'}</h3>
                      <Badge variant="secondary" className="px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] uppercase font-black tracking-tighter">
                        Host
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-black tracking-[0.2em] opacity-60">Your name in the room</p>
                  </div>
                </div>
              </motion.div>

              {/* Pro Features Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <Card
                  className="border-line"
                  style={{
                    backgroundColor: 'var(--panel-3)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg font-medium">
                      <Sparkles className="w-5 h-5 text-accent" />
                      What's in the room
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {[
                      { title: 'Camera and mic', desc: 'Right in your browser, nothing to install', icon: Video, color: 'text-brand-light' },
                      { title: 'Live captions', desc: 'Read along while people talk', icon: Zap, color: 'text-brand-light' },
                      { title: 'Recording', desc: 'Save the call and come back to it', icon: Shield, color: 'text-brand-light' },
                      { title: 'Notes afterwards', desc: 'Transcript, summary and action items', icon: BarChart, color: 'text-brand-light' },
                    ].map((f, i) => (
                      <motion.div
                        key={i}
                                                className="flex gap-4 p-4 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <div className={`p-3 rounded-lg bg-white/10 ${f.color}`}>
                          <f.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{f.title}</h4>
                          <p className="text-sm text-gray-400">{f.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .bg-size-200 {
          background-size: 200% auto;
        }

        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .animate-shine {
          animation: shine 1.5s infinite;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
}