"use client"

import { useRef, useEffect, useCallback, useState, useMemo } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, UserPlus, MessageCircle, Phone, Video, VideoOff, UserX, Users, MoreVertical, ShieldCheck, Clock, ArrowLeft, Send, Mic, Camera, Paperclip, Smile, Image as ImageIcon, X, Trash, Trash2, PhoneOff, MicOff, Volume2, VolumeX, RotateCcw, Maximize2, Star, Pin, Copy, Reply, Forward, AlertCircle, ChevronRight, ChevronLeft, CornerUpLeft, CornerUpRight, MessageSquare, ArrowUp, ArrowDown, Check, CheckCheck, Play, Pause, MoreHorizontal, Download, ZoomIn, ZoomOut, FileText, Info, Eye, Plus, ChevronDown, Archive, BellOff, PinOff, Heart, Ban, Settings, LogOut, UserMinus, HelpCircle, Pencil, Link as LinkIcon, Lock, Bell, Sun, Moon, Sparkles, Upload, Music, Crop, Wand2, Palette, Eraser, Timer, UserCheck, Mail } from "lucide-react"
import { authService, type User } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AnimatePresence, motion } from "framer-motion"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

// --- Dummy Data ---
const EMOJI_CATEGORIES = [
    {
        name: "Smileys & People",
        emojis: [
            { char: "😀", name: "grinning face", keywords: "happy, smile, grin" },
            { char: "😃", name: "grinning face with big eyes", keywords: "happy, smile, open mouth" },
            { char: "😄", name: "grinning face with smiling eyes", keywords: "happy, smile, joy" },
            { char: "😁", name: "beaming face with smiling eyes", keywords: "happy, smile, grin" },
            { char: "😆", name: "grinning squinting face", keywords: "happy, smile, laugh" },
            { char: "😅", name: "grinning face with sweat", keywords: "happy, smile, relief" },
            { char: "🤣", name: "rolling on the floor laughing", keywords: "lol, laugh, funny" },
            { char: "😂", name: "face with tears of joy", keywords: "lol, laugh, joy" },
            { char: "🙂", name: "slightly smiling face", keywords: "smile, happy" },
            { char: "🙃", name: "upside-down face", keywords: "silly, ironic" },
            { char: "😉", name: "winking face", keywords: "wink, flirt, joke" },
            { char: "😊", name: "smiling face with smiling eyes", keywords: "happy, heart, smile" },
            { char: "😇", name: "smiling face with halo", keywords: "angel, innocent, good" },
            { char: "🥰", name: "smiling face with hearts", keywords: "love, heart, adore" },
            { char: "😍", name: "smiling face with heart-eyes", keywords: "love, heart, crush" },
            { char: "🤩", name: "star-struck", keywords: "star, amazing, wow" },
            { char: "😘", name: "face blowing a kiss", keywords: "kiss, love, flirt" },
            { char: "😗", name: "kissing face", keywords: "kiss, love" },
            { char: "😚", name: "kissing face with closed eyes", keywords: "kiss, love" },
            { char: "😙", name: "kissing face with smiling eyes", keywords: "kiss, love" },
            { char: "😋", name: "face savoring food", keywords: "yum, delicious, tongue" },
            { char: "😛", name: "face with tongue", keywords: "silly, joke" },
            { char: "😜", name: "winking face with tongue", keywords: "silly, joke, wink" },
            { char: "🤪", name: "zany face", keywords: "crazy, silly" },
            { char: "😝", name: "squinting face with tongue", keywords: "silly, joke" },
            { char: "🤑", name: "money-mouth face", keywords: "money, rich" },
            { char: "🤗", name: "hugging face", keywords: "hug, comfort" },
            { char: "🤭", name: "face with hand over mouth", keywords: "giggle, secret" },
            { char: "🤫", name: "shushing face", keywords: "quiet, secret" },
            { char: "🤔", name: "thinking face", keywords: "think, ponder, hmm" },
            { char: "🤐", name: "zipper-mouth face", keywords: "quiet, secret" },
            { char: "🤨", name: "face with raised eyebrow", keywords: "skeptic, really" },
            { char: "😐", name: "neutral face", keywords: "neutral, meh" },
            { char: "😑", name: "expressionless face", keywords: "neutral, meh" },
            { char: "😶", name: "face without mouth", keywords: "quiet, silent" },
            { char: "😏", name: "smirking face", keywords: "smirk, flirt" },
            { char: "😒", name: "unamused face", keywords: "meh, bored" },
            { char: "🙄", name: "face with rolling eyes", keywords: "eyeroll, duh" },
            { char: "😬", name: "grimacing face", keywords: "awkward, oops" },
            { char: "🤥", name: "lying face", keywords: "lie, pinocchio" },
            { char: "😌", name: "relieved face", keywords: "phew, relief" },
            { char: "😔", name: "pensive face", keywords: "sad, regret" },
            { char: "😪", name: "sleepy face", keywords: "tired, sleep" },
            { char: "🤤", name: "drooling face", keywords: "yum, delicious" },
            { char: "😴", name: "sleeping face", keywords: "tired, sleep, zzz" },
            { char: "😷", name: "face with medical mask", keywords: "sick, mask" },
            { char: "🤒", name: "face with thermometer", keywords: "sick, fever" },
            { char: "🤕", name: "face with head-bandage", keywords: "hurt, injury" },
            { char: "🤢", name: "nauseated face", keywords: "sick, vomit" },
            { char: "🤮", name: "face vomiting", keywords: "sick, vomit" },
            { char: "🤧", name: "sneezing face", keywords: "sick, sneeze" },
            { char: "🥵", name: "hot face", keywords: "heat, hot" },
            { char: "🥶", name: "cold face", keywords: "cold, freeze" },
            { char: "🥴", name: "woozy face", keywords: "dizzy, drunk" },
            { char: "😵", name: "dizzy face", keywords: "dizzy, wow" },
            { char: "🤯", name: "exploding head", keywords: "wow, mind blown" },
            { char: "🤠", name: "cowboy hat face", keywords: "cowboy, hat" },
            { char: "🥳", name: "partying face", keywords: "party, celebrate" },
            { char: "😎", name: "smiling face with sunglasses", keywords: "cool, sun" },
            { char: "🤓", name: "nerd face", keywords: "nerd, smart" },
            { char: "🧐", name: "face with monocle", keywords: "fancy, smart" },
            { char: "😕", name: "confused face", keywords: "confused, hmm" },
            { char: "😟", name: "worried face", keywords: "worried, sad" },
            { char: "🙁", name: "slightly frowning face", keywords: "sad, frown" },
            { char: "☹️", name: "frowning face", keywords: "sad, frown" },
            { char: "😮", name: "face with open mouth", keywords: "wow, surprise" },
            { char: "😯", name: "hushed face", keywords: "quiet, wow" },
            { char: "😲", name: "astonished face", keywords: "wow, surprise" },
            { char: "😳", name: "flushed face", keywords: "blush, shy" },
            { char: "🥺", name: "pleading face", keywords: "please, beg, puppy eyes" },
            { char: "😦", name: "frowning face with open mouth", keywords: "sad, wow" },
            { char: "😧", name: "anguished face", keywords: "sad, hurt" },
            { char: "😨", name: "fearful face", keywords: "scared, fear" },
            { char: "😰", name: "anxious face with sweat", keywords: "scared, stress" },
            { char: "😥", name: "sad but relieved face", keywords: "sad, phew" },
            { char: "😢", name: "crying face", keywords: "sad, cry" },
            { char: "😭", name: "loudly crying face", keywords: "sad, cry, sob" },
            { char: "😱", name: "face screaming in fear", keywords: "scared, shock" },
            { char: "😖", name: "confounded face", keywords: "stress, mess" },
            { char: "😣", name: "persevering face", keywords: "stress, push" },
            { char: "😞", name: "disappointed face", keywords: "sad, regret" },
            { char: "😓", name: "downcast face with sweat", keywords: "sad, stress" },
            { char: "😩", name: "weary face", keywords: "tired, sad" },
            { char: "😫", name: "tired face", keywords: "tired, sad" },
            { char: "🥱", name: "yawning face", keywords: "tired, sleep" },
            { char: "😤", name: "face with steam from nose", keywords: "angry, win" },
            { char: "😡", name: "pouting face", keywords: "angry, red" },
            { char: "😠", name: "angry face", keywords: "angry" },
            { char: "🤬", name: "face with symbols on mouth", keywords: "angry, curse" },
            { char: "😈", name: "smiling face with horns", keywords: "devil, evil" },
            { char: "👿", name: "angry face with horns", keywords: "devil, evil, angry" },
            { char: "💀", name: "skull", keywords: "dead, scary" },
            { char: "☠️", name: "skull and crossbones", keywords: "dead, poison" },
            { char: "💩", name: "pile of poo", keywords: "poop, bad" },
            { char: "🤡", name: "clown face", keywords: "clown, funny" },
            { char: "👹", name: "ogre", keywords: "monster, scary" },
            { char: "👺", name: "goblin", keywords: "monster, scary" },
            { char: "👻", name: "ghost", keywords: "ghost, scary" },
            { char: "👽", name: "alien", keywords: "alien, space" },
            { char: "👾", name: "alien monster", keywords: "alien, game" },
            { char: "🤖", name: "robot", keywords: "robot, bot" },
            { char: "😺", name: "grinning cat", keywords: "cat, happy" },
            { char: "😸", name: "grinning cat with smiling eyes", keywords: "cat, happy" },
            { char: "😹", name: "cat with tears of joy", keywords: "cat, lol" },
            { char: "😻", name: "smiling cat with heart-eyes", keywords: "cat, love" },
            { char: "😼", name: "cat with wry smile", keywords: "cat, smirk" },
            { char: "😽", name: "kissing cat", keywords: "cat, kiss" },
            { char: "🙀", name: "weary cat", keywords: "cat, shock" },
            { char: "😿", name: "crying cat", keywords: "cat, sad" },
            { char: "😾", name: "pouting cat", keywords: "cat, angry" },
            { char: "🙈", name: "see-no-evil monkey", keywords: "monkey, oops" },
            { char: "🙉", name: "hear-no-evil monkey", keywords: "monkey, ops" },
            { char: "🙊", name: "speak-no-evil monkey", keywords: "monkey, ops" },
            { char: "💋", name: "kiss mark", keywords: "kiss, love" },
            { char: "💌", name: "love letter", keywords: "love, letter" },
            { char: "💘", name: "heart with arrow", keywords: "love, heart" },
            { char: "💝", name: "heart with ribbon", keywords: "love, heart" },
            { char: "💖", name: "sparkling heart", keywords: "love, heart" },
            { char: "💗", name: "growing heart", keywords: "love, heart" },
            { char: "💓", name: "beating heart", keywords: "love, heart" },
            { char: "💞", name: "revolving hearts", keywords: "love, heart" },
            { char: "💕", name: "two hearts", keywords: "love, heart" },
            { char: "💟", name: "heart decoration", keywords: "love, heart" },
            { char: "❣️", "name": "heart exclamation", "keywords": "love, heart" },
            { char: "💔", "name": "broken heart", "keywords": "love, sad" },
            { char: "❤️", "name": "red heart", "keywords": "love, heart" },
            { char: "🧡", "name": "orange heart", "keywords": "love, heart" },
            { char: "💛", "name": "yellow heart", "keywords": "love, heart" },
            { char: "💚", "name": "green heart", "keywords": "love, heart" },
            { char: "💙", "name": "blue heart", "keywords": "love, heart" },
            { char: "💜", "name": "purple heart", "keywords": "love, heart" },
            { char: "🖤", "name": "black heart", "keywords": "love, heart" },
            { char: "🤍", "name": "white heart", "keywords": "love, heart" },
            { char: "🤎", "name": "brown heart", "keywords": "love, heart" },
            { char: "💯", "name": "hundred points", "keywords": "score, amazing" },
            { char: "💢", "name": "anger symbol", "keywords": "angry" },
            { char: "💥", "name": "collision", "keywords": "boom, crash" },
            { char: "💫", "name": "dizzy", "keywords": "star, wow" },
            { char: "💦", "name": "sweat droplets", "keywords": "water, sweat" },
            { char: "💨", "name": "dashing away", "keywords": "fast, wind" },
            { char: "🕳️", "name": "hole", "keywords": "hole, black" },
            { char: "💣", "name": "bomb", "keywords": "boom, explosive" },
            { char: "💬", "name": "speech balloon", "keywords": "chat, speak" },
            { char: "👁️‍🗨️", "name": "eye in speech bubble", "keywords": "eye, chat" },
            { char: "🗨️", "name": "left speech bubble", "keywords": "chat, speak" },
            { char: "🗯️", "name": "right anger bubble", "keywords": "chat, angry" },
            { char: "💭", "name": "thought balloon", "keywords": "think, dream" },
            { char: "💤", "name": "zzz", "keywords": "sleep, tired" }
        ]
    },
    {
        name: "Animals & Nature",
        emojis: [
            { char: "🐶", name: "dog face", keywords: "dog, pet, puppy" },
            { char: "🐱", name: "cat face", keywords: "cat, pet, kitten" },
            { char: "🐭", name: "mouse face", keywords: "mouse, rodent" },
            { char: "🐹", name: "hamster", keywords: "hamster, pet" },
            { char: "🐰", name: "rabbit face", keywords: "rabbit, bunny" },
            { char: "🦊", name: "fox", keywords: "fox, wild" },
            { char: "🐻", name: "bear", keywords: "bear, wild" },
            { char: "🐼", name: "panda", keywords: "panda, wild" },
            { char: "🐻‍❄️", name: "polar bear", keywords: "bear, cold" },
            { char: "🐨", name: "koala", keywords: "koala, wild" },
            { char: "🐯", name: "tiger face", keywords: "tiger, wild" },
            { char: "🦁", name: "lion", keywords: "lion, wild" },
            { char: "🐮", name: "cow face", keywords: "cow, farm" },
            { char: "🐷", name: "pig face", keywords: "pig, farm" },
            { char: "🐽", name: "pig nose", keywords: "pig, nose" },
            { char: "🐸", name: "frog", keywords: "frog, wild" },
            { char: "🐵", name: "monkey face", keywords: "monkey, wild" },
            { char: "🙈", name: "see-no-evil monkey", keywords: "monkey, ops" },
            { char: "🙉", name: "hear-no-evil monkey", keywords: "monkey, ops" },
            { char: "🙊", name: "speak-no-evil monkey", keywords: "monkey, ops" },
            { char: "🐒", name: "monkey", keywords: "monkey, wild" },
            { char: "🐔", name: "chicken", keywords: "chicken, farm" },
            { char: "🐧", name: "penguin", keywords: "penguin, cold" },
            { char: "🐦", name: "bird", keywords: "bird, wild" },
            { char: "🐤", name: "baby chick", keywords: "chick, baby" },
            { char: "🐣", name: "hatching chick", keywords: "chick, egg" },
            { char: "🐥", name: "front-facing baby chick", keywords: "chick, baby" },
            { char: "🦆", name: "duck", keywords: "duck, wild" },
            { char: "🦅", name: "eagle", keywords: "eagle, wild" },
            { char: "🦉", name: "owl", keywords: "owl, night" },
            { char: "🦇", name: "bat", keywords: "bat, night" },
            { char: "🐺", name: "wolf", keywords: "wolf, wild" },
            { char: "🐗", name: "boar", keywords: "boar, wild" },
            { char: "🐴", name: "horse face", keywords: "horse, wild" },
            { char: "🦄", name: "unicorn", keywords: "magic, horse" },
            { char: "🐝", name: "honeybee", keywords: "bee, honey" },
            { char: "🪱", name: "worm", keywords: "worm, dirty" },
            { char: "🐛", name: "bug", keywords: "bug, insect" },
            { char: "🦋", name: "butterfly", keywords: "butterfly, bug" },
            { char: "🐌", name: "snail", keywords: "snail, slow" },
            { char: "🐞", name: "lady beetle", keywords: "bug, red" },
            { char: "Ant", "char": "🐜", "name": "ant", "keywords": "bug, insect" },
            { char: "Mosquito", "char": "🦟", "name": "mosquito", "keywords": "bug, blood" },
            { char: "Cricket", "char": "🦗", "name": "cricket", "keywords": "bug, music" },
            { char: "Spider", "char": "🕷️", "name": "spider", "keywords": "bug, scary" },
            { char: "Web", "char": "🕸️", "name": "spider web", "keywords": "spider, web" },
            { char: "Scorpion", "char": "🦂", "name": "scorpion", "keywords": "bug, scary" },
            { char: "Turtle", "char": "🐢", "name": "turtle", "keywords": "turtle, slow" },
            { char: "Snake", "char": "🐍", "name": "snake", "keywords": "snake, scary" },
            { char: "Lizard", "char": "🦎", "name": "lizard", "keywords": "lizard, reptile" },
            { char: "Rex", "char": "🦖", "name": "t-rex", "keywords": "dinosaur, scary" },
            { char: "Sauropod", "char": "🦕", "name": "sauropod", "keywords": "dinosaur, huge" },
            { char: "Octopus", "char": "🐙", "name": "octopus", "keywords": "sea, Eight legs" },
            { char: "Squid", "char": "🦑", "name": "squid", "keywords": "sea, ink" },
            { char: "Shrimp", "char": "🦐", "name": "shrimp", "keywords": "sea, Food" },
            { char: "Lobster", "char": "🦞", "name": "lobster", "keywords": "sea, red" },
            { char: "Crab", "char": "🦀", "name": "crab", "keywords": "sea, beach" },
            { char: "Pufferfish", "char": "🐡", "name": "pufferfish", "keywords": "sea, Round" },
            { char: "Tropical Fish", "char": "🐠", "name": "tropical fish", "keywords": "sea, color" },
            { char: "Fish", "char": "🐟", "name": "fish", "keywords": "sea, swim" },
            { char: "Dolphin", "char": "🐬", "name": "dolphin", "keywords": "sea, smart" },
            { char: "Whale", "char": "🐳", "name": "spouting whale", "keywords": "sea, huge" },
            { char: "Whale 2", "char": "🐋", "name": "whale", "keywords": "sea, huge" },
            { char: "Shark", "char": "🦈", "name": "shark", "keywords": "sea, scary" },
            { char: "Crocodile", "char": "🐊", "name": "crocodile", "keywords": "sea, scary" },
            { char: "Tiger", "char": "🐅", "name": "tiger", "keywords": "tiger, wild" },
            { char: "Leopard", "char": "🐆", "name": "leopard", "keywords": "leopard, wild" },
            { char: "Zebra", "char": "🦓", "name": "zebra", "keywords": "zebra, wild" },
            { char: "Gorilla", "char": "🦍", "name": "gorilla", "keywords": "gorilla, wild" },
            { char: "Orangutan", "char": "🦧", "name": "orangutan", "keywords": "monkey, wild" },
            { char: "Mammoth", "char": "🦣", "name": "mammoth", "keywords": "elephant, huge" },
            { char: "Elephant", "char": "🐘", "name": "elephant", "keywords": "elephant, huge" },
            { char: "Hippo", "char": "🦛", "name": "hippopotamus", "keywords": "hippo, wild" },
            { char: "Rhino", "char": "🦏", "name": "rhinoceros", "keywords": "rhino, wild" },
            { char: "Camel", "char": "🐪", "name": "camel", "keywords": "camel, desert" },
            { char: "Camel 2", "char": "🐫", "name": "two-hump camel", "keywords": "camel, desert" },
            { char: "Giraffe", "char": "🦒", "name": "giraffe", "keywords": "giraffe, wild" },
            { char: "Kangaroo", "char": "🦘", "name": "kangaroo", "keywords": "kangaroo, wild" },
            { char: "Bison", "char": "🦬", "name": "bison", "keywords": "bison, wild" },
            { char: "Buffalo", "char": "🐃", "name": "water buffalo", "keywords": "buffalo, wild" },
            { char: "Ox", "char": "🐂", "name": "ox", "keywords": "ox, farm" },
            { char: "Cow", "char": "🐄", "name": "cow", "keywords": "cow, farm" },
            { char: "Horse", "char": "🐎", "name": "horse", "keywords": "horse, wild" },
            { char: "Pig", "char": "🐖", "name": "pig", "keywords": "pig, farm" },
            { char: "Ram", "char": "🐏", "name": "ram", "keywords": "ram, farm" },
            { char: "Sheep", "char": "🐑", "name": "sheep", "keywords": "sheep, farm" },
            { char: "Llama", "char": "🦙", "name": "llama", "keywords": "llama, farm" },
            { char: "Goat", "char": "🐐", "name": "goat", "keywords": "goat, farm" },
            { char: "Deer", "char": "🦌", "name": "deer", "keywords": "deer, wild" },
            { char: "Dog", "char": "🐕", "name": "dog", "keywords": "dog, pet" },
            { char: "Poodle", "char": "🐩", "name": "poodle", "keywords": "dog, pet" },
            { char: "Guide Dog", "char": "🦮", "name": "guide dog", "keywords": "dog, help" },
            { char: "Service Dog", "char": "🐕‍🦺", "name": "service dog", "keywords": "dog, help" },
            { char: "Cat", "char": "🐈", "name": "cat", "keywords": "cat, pet" },
            { char: "Black Cat", "char": "🐈‍⬛", "name": "black cat", "keywords": "cat, pet" },
            { char: "Rooster", "char": "🐓", "name": "rooster", "keywords": "rooster, farm" },
            { char: "Turkey", "char": "🦃", "name": "turkey", "keywords": "turkey, farm" },
            { char: "Peacock", "char": "🦚", "name": "peacock", "keywords": "peacock, wild" },
            { char: "Parrot", "char": "🦜", "name": "parrot", "keywords": "parrot, color" },
            { char: "Swan", "char": "🦢", "name": "swan", "keywords": "swan, white" },
            { char: "Flamingo", "char": "🦩", "name": "flamingo", "keywords": "flamingo, pink" },
            { char: "Dove", "char": "🕊️", "name": "dove", "keywords": "dove, white" },
            { char: "Rabbit", "char": "🐇", "name": "rabbit", "keywords": "rabbit, bunny" },
            { char: "Raccoon", "char": "🦝", "name": "raccoon", "keywords": "raccoon, wild" },
            { char: "Skunk", "char": "🦨", "name": "skunk", "keywords": "skunk, wild" },
            { char: "Badger", "char": "🦡", "name": "badger", "keywords": "badger, wild" },
            { char: "Beaver", "char": "🦫", "name": "beaver", "keywords": "beaver, wild" },
            { char: "Otter", "char": "🦦", "name": "otter", "keywords": "otter, sea" },
            { char: "Sloth", "char": "🦥", "name": "sloth", "keywords": "sloth, slow" },
            { char: "Mouse", "char": "🐁", "name": "mouse", "keywords": "mouse, rodent" },
            { char: "Rat", "char": "🐀", "name": "rat", "keywords": "rat, rodent" },
            { char: "Squirrel", "char": "🐿️", "name": "squirrel", "keywords": "squirrel, wood" },
            { char: "Hedgehog", "char": "🦔", "name": "hedgehog", "keywords": "hedgehog, slow" },
            { char: "Cactus", "char": "🌵", "name": "cactus", "keywords": "cactus, desert" },
            { char: "Tree", "char": "🌳", "name": "deciduous tree", "keywords": "tree, wood" },
            { char: "Palm Tree", "char": "🌴", "name": "palm tree", "keywords": "tree, sun" },
            { char: "Leaf", "char": "🍃", "name": "leaf fluttering in wind", "keywords": "leaf, wind" },
            { char: "Fallen Leaf", "char": "🍂", "name": "fallen leaf", "keywords": "leaf, autumn" },
            { char: "Maple Leaf", "char": "🍁", "name": "maple leaf", "keywords": "leaf, Canada" },
            { char: "Mushroom", "char": "🍄", "name": "mushroom", "keywords": "mushroom, food" },
            { char: "Sun", "char": "☀️", "name": "sun", "keywords": "sun, hot" },
            { char: "Moon", "char": "🌙", "name": "crescent moon", "keywords": "moon, night" },
            { char: "Star", "char": "⭐", "name": "star", "keywords": "star, shine" },
            { char: "Rain", "char": "🌧️", "name": "cloud with rain", "keywords": "rain, water" },
            { char: "Fire", "char": "🔥", "name": "fire", "keywords": "fire, hot" },
            { char: "Water", "char": "💧", "name": "droplet", "keywords": "water, blue" }
        ]
    },
    {
        name: "Food & Drink",
        emojis: [
            { char: "🍏", name: "green apple", keywords: "apple, fruit, green" },
            { char: "🍎", name: "red apple", keywords: "apple, fruit, red" },
            { char: "🍐", name: "pear", keywords: "pear, fruit" },
            { char: "🍊", name: "tangerine", keywords: "orange, fruit" },
            { char: "🍋", name: "lemon", keywords: "lemon, fruit, sour" },
            { char: "🍌", name: "banana", keywords: "banana, fruit" },
            { char: "🍉", name: "watermelon", keywords: "watermelon, fruit" },
            { char: "🍇", name: "grapes", keywords: "grapes, fruit" },
            { char: "🍓", name: "strawberry", keywords: "strawberry, fruit" },
            { char: "🫐", name: "blueberries", keywords: "blueberries, fruit" },
            { char: "🍈", name: "melon", keywords: "melon, fruit" },
            { char: "🍒", name: "cherries", keywords: "cherries, fruit" },
            { char: "🍑", name: "peach", keywords: "peach, fruit" },
            { char: "🥭", name: "mango", keywords: "mango, fruit" },
            { char: "🍍", name: "pineapple", keywords: "pineapple, fruit" },
            { char: "🥥", name: "coconut", keywords: "coconut, fruit" },
            { char: "🥝", name: "kiwi fruit", keywords: "kiwi, fruit" },
            { char: "🍅", name: "tomato", keywords: "tomato, vegetable" },
            { char: "🍆", name: "eggplant", keywords: "eggplant, vegetable" },
            { char: "🥑", name: "avocado", keywords: "avocado, fruit" },
            { char: "🥦", name: "broccoli", keywords: "broccoli, vegetable" },
            { char: "🥬", name: "leafy green", keywords: "lettuce, vegetable" },
            { char: "🥒", name: "cucumber", keywords: "cucumber, vegetable" },
            { char: "🌶️", name: "hot pepper", keywords: "pepper, spicy" },
            { char: "🫑", name: "bell pepper", keywords: "pepper, vegetable" },
            { char: "🌽", name: "ear of corn", keywords: "corn, vegetable" },
            { char: "🥕", name: "carrot", keywords: "carrot, vegetable" },
            { char: "🫒", name: "olive", keywords: "olive, food" },
            { char: "🧄", name: "garlic", keywords: "garlic, food" },
            { char: "🧅", name: "onion", keywords: "onion, food" },
            { char: "🍄", name: "mushroom", keywords: "mushroom, food" },
            { char: "🥜", name: "peanuts", keywords: "peanuts, nut" },
            { char: "🫘", name: "beans", keywords: "beans, food" },
            { char: "🌰", name: "chestnut", keywords: "chestnut, food" },
            { char: "Bread", "char": "🍞", "name": "bread", "keywords": "bread, food" },
            { char: "Croissant", "char": "🥐", "name": "croissant", "keywords": "bread, french" },
            { char: "Baguette", "char": "🥖", "name": "baguette", "keywords": "bread, french" },
            { char: "Flatbread", "char": "🫓", "name": "flatbread", "keywords": "bread, food" },
            { char: "Pretzel", "char": "🥨", "name": "pretzel", "keywords": "bread, salt" },
            { char: "Bagel", "char": "🥯", "name": "bagel", "keywords": "bread, round" },
            { char: "Pancake", "char": "🥞", "name": "pancakes", "keywords": "pancake, sweet" },
            { char: "Waffle", "char": "🧇", "name": "waffle", "keywords": "waffle, sweet" },
            { char: "Cheese", "char": "🧀", "name": "cheese wedge", "keywords": "cheese, food" },
            { char: "Meat", "char": "🍖", "name": "meat on bone", "keywords": "meat, food" },
            { char: "Chicken", "char": "🍗", "name": "poultry leg", "keywords": "chicken, food" },
            { char: "Steak", "char": "🥩", "name": "cut of meat", "keywords": "meat, food" },
            { char: "Bacon", "char": "🥓", "name": "bacon", "keywords": "meat, food" },
            { char: "Burger", "char": "🍔", "name": "hamburger", "keywords": "burger, fast food" },
            { char: "Fries", "char": "🍟", "name": "french fries", "keywords": "fries, fast food" },
            { char: "Pizza", "char": "🍕", "name": "pizza", "keywords": "pizza, food" },
            { char: "Hot Dog", "char": "🌭", "name": "hot dog", "keywords": "hotdog, food" },
            { char: "Sandwich", "char": "🥪", "name": "sandwich", "keywords": "sandwich, food" },
            { char: "Taco", "char": "🌮", "name": "taco", "keywords": "taco, food" },
            { char: "Burrito", "char": "🌯", "name": "burrito", "keywords": "burrito, food" },
            { char: "Tamale", "char": "🫔", "name": "tamale", "keywords": "tamale, food" },
            { char: "Falafel", "char": "🧆", "name": "falafel", "keywords": "falafel, food" },
            { char: "Egg", "char": "🥚", "name": "egg", "keywords": "egg, food" },
            { char: "Fried Egg", "char": "🍳", "name": "cooking", "keywords": "egg, fry" },
            { char: "Paella", "char": "🥘", "name": "shallow pan of food", "keywords": "paella, rice" },
            { char: "Stew", "char": "🍲", "name": "pot of food", "keywords": "stew, soup" },
            { char: "Fondue", "char": "🫕", "name": "fondue", "keywords": "cheese, dip" },
            { char: "Bowl", "char": "🥣", "name": "bowl with spoon", "keywords": "soup, cereal" },
            { char: "Salad", "char": "🥗", "name": "green salad", "keywords": "salad, green" },
            { char: "Popcorn", "char": "🍿", "name": "popcorn", "keywords": "popcorn, movie" },
            { char: "Butter", "char": "🧈", "name": "butter", "keywords": "butter, food" },
            { char: "Salt", "char": "🧂", "name": "salt", "keywords": "salt, food" },
            { char: "Can", "char": "🥫", "name": "canned food", "keywords": "can, food" },
            { char: "Bento", "char": "🍱", "name": "bento box", "keywords": "bento, food" },
            { char: "Rice 1", "char": "🍘", "name": "rice cracker", "keywords": "rice, food" },
            { char: "Rice 2", "char": "🍙", "name": "rice ball", "keywords": "rice, food" },
            { char: "Rice 3", "char": "🍚", "name": "cooked rice", "keywords": "rice, food" },
            { char: "Curry", "char": "🍛", "name": "curry rice", "keywords": "curry, food" },
            { char: "Noodle", "char": "🍜", "name": "steaming bowl", "keywords": "noodle, food" },
            { char: "Pasta", "char": "🍝", "name": "spaghetti", "keywords": "pasta, food" },
            { char: "Yam", "char": "🍠", "name": "roasted sweet potato", "keywords": "yam, food" },
            { char: "Oden", "char": "🍢", "name": "oden", "keywords": "oden, food" },
            { char: "Sushi", "char": "🍣", "name": "sushi", "keywords": "sushi, food" },
            { char: "Shrimp 2", "char": "🍤", "name": "fried shrimp", "keywords": "shrimp, food" },
            { char: "Fishcake", "char": "🍥", "name": "fish cake with swirl", "keywords": "fishcake, food" },
            { char: "Mooncake", "char": "🥮", "name": "moon cake", "keywords": "mooncake, food" },
            { char: "Dango", "char": "🍡", "name": "dango", "keywords": "dango, food" },
            { char: "Dumpling", "char": "🥟", "name": "dumpling", "keywords": "dumpling, food" },
            { char: "Fortune", "char": "🥠", "name": "fortune cookie", "keywords": "fortune, cookie" },
            { char: "Takeout", "char": "🥡", "name": "takeout box", "keywords": "takeout, food" },
            { char: "Ice Cream 1", "char": "🍦", "name": "soft serve", "keywords": "icecream, sweet" },
            { char: "Ice Cream 2", "char": "🍧", "name": "shaved ice", "keywords": "icecream, sweet" },
            { char: "Ice Cream 3", "char": "🍨", "name": "ice cream", "keywords": "icecream, sweet" },
            { char: "Donut", "char": "🍩", "name": "doughnut", "keywords": "donut, sweet" },
            { char: "Cookie", "char": "🍪", "name": "cookie", "keywords": "cookie, sweet" },
            { char: "Cake 1", "char": "🎂", "name": "birthday cake", "keywords": "cake, sweet" },
            { char: "Cake 2", "char": "🍰", "name": "shortcake", "keywords": "cake, sweet" },
            { char: "Cupcake", "char": "🧁", "name": "cupcake", "keywords": "cupcake, sweet" },
            { char: "Pie", "char": "🥧", "name": "pie", "keywords": "pie, sweet" },
            { char: "Choco", "char": "🍫", "name": "chocolate bar", "keywords": "chocolate, sweet" },
            { char: "Candy 1", "char": "🍬", "name": "candy", "keywords": "candy, sweet" },
            { char: "Candy 2", "char": "🍭", "name": "lollipop", "keywords": "lollipop, sweet" },
            { char: "Custard", "char": "🍮", "name": "custard", "keywords": "custard, sweet" },
            { char: "Honey", "char": "🍯", "name": "honey pot", "keywords": "honey, sweet" },
            { char: "Milk", "char": "🍼", "name": "baby bottle", "keywords": "milk, baby" },
            { char: "Glass", "char": "🥛", "name": "glass of milk", "keywords": "milk, food" },
            { char: "Coffee", "char": "☕", "name": "hot beverage", "keywords": "coffee, tea" },
            { char: "Tea 1", "char": "🫖", "name": "teapot", "keywords": "tea, pot" },
            { char: "Tea 2", "char": "🍵", "name": "teacup without handle", "keywords": "tea, drink" },
            { char: "Sake", "char": "🍶", "name": "sake", "keywords": "sake, drink" },
            { char: "Champagne", "char": "🍾", "name": "bottle with popping cork", "keywords": "champagne, celebrate" },
            { char: "Wine", "char": "🍷", "name": "wine glass", "keywords": "wine, drink" },
            { char: "Cocktail 1", "char": "🍸", "name": "cocktail glass", "keywords": "cocktail, drink" },
            { char: "Cocktail 2", "char": "🍹", "name": "tropical drink", "keywords": "cocktail, drink" },
            { char: "Beer 1", "char": "🍺", "name": "beer mug", "keywords": "beer, drink" },
            { char: "Beer 2", "char": "🍻", "name": "clinking beer mugs", "keywords": "beer, celebrate" },
            { char: "Cheers", "char": "🥂", "name": "clinking glasses", "keywords": "celebrate, drink" },
            { char: "Whiskey", "char": "🥃", "name": "tumbler glass", "keywords": "whiskey, drink" },
            { char: "Soda", "char": "🥤", "name": "cup with straw", "keywords": "soda, drink" },
            { char: "Boba", "char": "🧋", "name": "bubble tea", "keywords": "boba, tea" },
            { char: "Juice", "char": "🧃", "name": "beverage box", "keywords": "juice, drink" },
            { char: "Mate", "char": "🧉", "name": "mate", "keywords": "mate, drink" }
        ]
    }
]

// Dummy data for simulation
const DUMMY_USERS = [
    {
        id: 1,
        name: "John Doe",
        email: "user1@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
        isFriend: true,
        status: "online",
        lastSeen: "Just now",
        bio: "AI enthusiast and coffee lover.",
    },
    {
        id: 2,
        name: "Jane Smith",
        email: "user2@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
        isFriend: true,
        status: "offline",
        lastSeen: "2 hours ago",
        bio: "Transcribing the world, one meeting at a time.",
    },
    {
        id: 3,
        name: "Mike Ross",
        email: "user3@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        isFriend: true,
        status: "online",
        lastSeen: "Just now",
        bio: "Legal eagle and tech geek.",
    },
    {
        id: 4,
        name: "Rachel Zane",
        email: "user4@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel",
        isFriend: true,
        status: "offline",
        lastSeen: "Yesterday",
        bio: "Paralegal by day, artist by night.",
    },
    {
        id: 6,
        name: "Jane ",
        email: "user6@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
        isFriend: true,
        status: "offline",
        lastSeen: "2 hours ago",
        bio: "Transcribing the world, one meeting at a time.",
    },
    // This user exists globally but is NOT a friend yet
    {
        id: 5,
        name: "Global User",
        email: "global@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Global",
        isFriend: false,
        status: "offline",
        lastSeen: "Long ago",
        bio: "Just a random user in the system.",
    }
]

interface FriendItem {
    id: number;
    name: string;
    email: string;
    image: string;
    isFriend: boolean;
    status: string;
    lastSeen: string;
    bio: string;
    isPinned?: boolean;
    isBlocked?: boolean; // I blocked them
    hasBlockedMe?: boolean; // They blocked me
    isMuted?: boolean;
    isArchived?: boolean;
    unreadCount?: number;
    isUnread?: boolean; // Manual unread status
    isFavourite?: boolean;
    isGroup?: boolean;
    memberIds?: number[];
    adminIds?: number[];
    description?: string;
    createdAt?: string;
    isExited?: boolean;
    groupSettings?: {
        onlyAdminsCanEditInfo: boolean;
        onlyAdminsCanAddMembers: boolean;
        onlyAdminsCanSendMessages: boolean;
    };
    creatorId?: number;
}

const DUMMY_MESSAGES: Record<number, any[]> = {
    1: [
        { id: 1, text: "Hey John! How's the AI project going?", sender: 'me', time: '10:00 AM', type: 'text', isStarred: false, isPinned: false, isDeleted: false, deletedForMe: false },
        { id: 2, text: "It's going great! Just finished the neural net architecture.", sender: 'them', time: '10:02 AM', type: 'text', isStarred: true, isPinned: false, isDeleted: false, deletedForMe: false },
        { id: 3, text: "That's awesome! Can't wait to see it.", sender: 'me', time: '10:05 AM', type: 'text', isStarred: false, isPinned: true, isDeleted: false, deletedForMe: false },
    ],
    2: [
        { id: 1, text: "Hi Jane, did you finish the transcriptions?", sender: 'me', time: 'Yesterday', type: 'text', isStarred: false, isPinned: false, isDeleted: false, deletedForMe: false },
        { id: 2, text: "Working on them now, should be ready in an hour.", sender: 'them', time: 'Yesterday', type: 'text', isStarred: false, isPinned: false, isDeleted: false, deletedForMe: false },
    ],
    3: [
        { id: 1, text: "Mike, we need to review that case file.", sender: 'me', time: '09:00 AM', type: 'text', isStarred: false, isPinned: false, isDeleted: false, deletedForMe: false },
        { id: 2, text: "I'm on it. Meeting in 15?", sender: 'them', time: '09:10 AM', type: 'text', isStarred: false, isPinned: false, isDeleted: false, deletedForMe: false },
    ],
    4: [
        { id: 1, text: "The artwork looks amazing, Rachel!", sender: 'me', time: '2:30 PM', type: 'text', isStarred: false, isPinned: false, isDeleted: false, deletedForMe: false },
        { id: 2, text: "Thank you so much! Glad you liked the palette.", sender: 'them', time: '2:45 PM', type: 'text', isStarred: false, isPinned: false, isDeleted: false, deletedForMe: false },
    ],
}

// --- IndexedDB Utility for Audio ---
const DB_NAME = 'TalkToText_AudioDB';
const STORE_NAME = 'custom_tones';

const audioDB = {
    async init() {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveTone(id: string, name: string, blob: Blob, type: 'message' | 'group' | 'call') {
        const db = await this.init();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put({ id, name, blob, type, createdAt: Date.now() });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    async getAllTones() {
        const db = await this.init();
        return new Promise<any[]>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteTone(id: string) {
        const db = await this.init();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
};

export default function FriendsPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [addEmail, setAddEmail] = useState("")
    const [isAddingFriend, setIsAddingFriend] = useState(false)
    const [selectedFriendId, setSelectedFriendId] = useState<number | null>(DUMMY_USERS[0].id)
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
    const [globalSearchResult, setGlobalSearchResult] = useState<typeof DUMMY_USERS[0] | null | "not_found">(null)
    const [messages, setMessages] = useState<Record<number, any[]>>(DUMMY_MESSAGES)
    const [newMessage, setNewMessage] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()

    // Friends List State
    const [friendsList, setFriendsList] = useState<FriendItem[]>(DUMMY_USERS.filter(u => u.isFriend).map(u => ({ ...u, unreadCount: 0, isUnread: false, isGroup: false })))
    const [activeView, setActiveView] = useState<'all' | 'favorites' | 'archived' | 'settings' | 'profile' | 'settings_chats' | 'settings_privacy' | 'settings_blocked_contacts' | 'settings_video_voice' | 'settings_notifications' | 'friend_requests' | 'broadcast_lists' | 'group_invites' | 'call_log'>('all')
    const [settingsSearchQuery, setSettingsSearchQuery] = useState('')
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [isEditingName, setIsEditingName] = useState(false)
    const [isEditingBio, setIsEditingBio] = useState(false)
    const [editedName, setEditedName] = useState("")
    const [editedBio, setEditedBio] = useState("")
    const [isViewingPhoto, setIsViewingPhoto] = useState(false)

    useEffect(() => {
        const user = authService.getCurrentUser()
        setCurrentUser(user)
        if (user) {
            setEditedName(user.full_name)
            setEditedBio(user.bio || "")
        }
    }, [])

    const handleSaveName = () => {
        if (!currentUser || !editedName.trim()) return
        const updatedUser = { ...currentUser, full_name: editedName }
        setCurrentUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setIsEditingName(false)
        toast({ title: "Name Updated", description: "Your name has been updated successfully." })
    }

    const handleSaveBio = () => {
        if (!currentUser) return
        const updatedUser = { ...currentUser, bio: editedBio }
        setCurrentUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setIsEditingBio(false)
        toast({ title: "Bio Updated", description: "Your bio has been updated successfully." })
    }

    const handleAvatarUpdate = (imageUrl: string) => {
        if (!currentUser) return
        // In a real app, this would be a server call
        const updatedUser = { ...currentUser, image: imageUrl }
        setCurrentUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        toast({ title: "Avatar Updated", description: "Your profile picture has been updated." })
    }

    const handleRemovePhoto = () => {
        if (!currentUser) return
        const updatedUser = { ...currentUser, image: "" }
        setCurrentUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        toast({ title: "Avatar Removed", description: "Your profile picture has been removed." })
    }
    const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups'>('all')
    const [viewTitle, setViewTitle] = useState("Friends")

    // Modal States
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [blockConfirm, setBlockConfirm] = useState<FriendItem | null>(null)
    const [friendDeleteConfirm, setFriendDeleteConfirm] = useState<FriendItem | null>(null)

    // Hardware/Media States
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [recordedVoice, setRecordedVoice] = useState<{ url: string, duration: number } | null>(null)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [cameraPurpose, setCameraPurpose] = useState<'message' | 'group_creation' | 'group_update'>('message')
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [isImageFromGallery, setIsImageFromGallery] = useState(false)
    const [activeEditorTool, setActiveEditorTool] = useState<'crop' | 'filter' | 'marker' | null>(null)
    const [appliedFilter, setAppliedFilter] = useState('none')
    const [markerColor, setMarkerColor] = useState('#ff0000')
    const [brushSize, setBrushSize] = useState(5)
    const editorCanvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 })
    const editorImageRef = useRef<HTMLImageElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const wallpaperInputRef = useRef<HTMLInputElement>(null)

    // Calling States
    const [callState, setCallState] = useState<'idle' | 'ringing' | 'connected' | 'ended'>('idle')
    const [callType, setCallType] = useState<'audio' | 'video'>('audio')
    const [isMuted, setIsMuted] = useState(false)
    const [isSpeakerOn, setIsSpeakerOn] = useState(false)
    const [isCameraPaused, setIsCameraPaused] = useState(false)
    const callTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [callDuration, setCallDuration] = useState(0)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

    // Advanced Feature States
    const [replyingTo, setReplyingTo] = useState<any | null>(null)
    const [isForwarding, setIsForwarding] = useState<any[] | null>(null)
    const [forwardTargets, setForwardTargets] = useState<number[]>([])
    const [isStarredViewOpen, setIsStarredViewOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number, type: 'me' | 'everyone' } | null>(null)
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ type: 'me' | 'everyone' } | null>(null)
    const [showScrollButton, setShowScrollButton] = useState(false)
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([])
    const messageRefs = useRef<Record<number, HTMLDivElement | null>>({})
    const [showBulkChatDeleteModal, setShowBulkChatDeleteModal] = useState(false)
    const [showBulkMessageDeleteModal, setShowBulkMessageDeleteModal] = useState(false)
    const [mediaPreview, setMediaPreview] = useState<{ type: 'image' | 'video' | 'file', url: string, name?: string } | null>(null)
    const [mediaZoom, setMediaZoom] = useState(1)
    const [messageInfo, setMessageInfo] = useState<any | null>(null)

    // Chat Actions Menu States
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
    const [selectedChatIds, setSelectedChatIds] = useState<number[]>([])
    const [showStarredMessagesModal, setShowStarredMessagesModal] = useState(false)

    // Group Creation States
    const [isCreatingGroup, setIsCreatingGroup] = useState(false)
    const [groupStep, setGroupStep] = useState<1 | 2>(1)
    const [newGroupName, setNewGroupName] = useState("")
    const [newGroupImage, setNewGroupImage] = useState<string | null>(null)
    const [selectedGroupMembers, setSelectedGroupMembers] = useState<number[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const [showGroupInfo, setShowGroupInfo] = useState(false)
    const [isEditingGroupName, setIsEditingGroupName] = useState(false)
    const [tempGroupName, setTempGroupName] = useState("")
    const [memberSearchQuery, setMemberSearchQuery] = useState("")
    const [isAddingMemberModalOpen, setIsAddingMemberModalOpen] = useState(false)
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [tempDescription, setTempDescription] = useState("")
    const [isTransferringAdmin, setIsTransferringAdmin] = useState(false)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [reportReason, setReportReason] = useState("")
    const [groupToExit, setGroupToExit] = useState<number | null>(null)
    const [isSearchActive, setIsSearchActive] = useState(false)
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false)
    const [isMediaViewOpen, setIsMediaViewOpen] = useState(false)
    const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs' | 'links'>('media')
    const [isMsgSearchActive, setIsMsgSearchActive] = useState(false)
    const [reportFriend, setReportFriend] = useState<FriendItem | null>(null)
    const [friendReportReason, setFriendReportReason] = useState("")
    const [msgSearchQuery, setMsgSearchQuery] = useState("")
    const [clearChatConfirm, setClearChatConfirm] = useState<number | null>(null)
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
    const [openContextMenuId, setOpenContextMenuId] = useState<number | null>(null)
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [chatWallpaper, setChatWallpaper] = useState<string>("")
    const [chatOverlayPattern, setChatOverlayPattern] = useState<'none' | 'stars' | 'mosaic' | 'lattice' | 'neural' | 'custom' | 'circuit' | 'triangles' | 'waves'>('stars')

    // Pattern Definitions - Professional, Advanced & Max Visibility
    const CHAT_OVERLAY_PATTERNS = {
        none: '',
        stars: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 10l1.5 3 3 .5-2.2 2.2.5 3.3-2.8-1.5-2.8 1.5.5-3.3-2.2-2.2 3-.5L15 10zm40 15l1 2 2 .3-1.5 1.5.3 2.2-1.8-1-1.8 1 .3-2.2-1.5-1.5 2-.3L55 25zm-30 35l2 4 4 .6-3 3 .6 4.4-3.6-2-3.6 2 .6-4.4-3-3 4-.6L25 60zm45-10l1.5 3 3 .5-2.2 2.2.5 3.3-2.8-1.5-2.8 1.5.5-3.3-2.2-2.2 3-.5L70 50zm25 40l1 2 2 .3-1.5 1.5.3 2.2-1.8-1-1.8 1 .3-2.2-1.5-1.5 2-.3L95 90zM10 90l1 2 2 .3-1.5 1.5.3 2.2-1.8-1-1.8 1 .3-2.2-1.5-1.5 2-.3L10 90z' fill='%23ffffff' fill-opacity='0.8'/%3E%3C/svg%3E")`,
        mosaic: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='28' height='28' x='1' y='1' fill='none' stroke='%23ffffff' stroke-width='2' stroke-opacity='0.8'/%3E%3Crect width='28' height='28' x='31' y='31' fill='none' stroke='%23ffffff' stroke-width='2' stroke-opacity='0.8'/%3E%3Crect width='28' height='28' x='31' y='1' fill='%23ffffff' fill-opacity='0.3'/%3E%3Crect width='28' height='28' x='1' y='31' fill='%23ffffff' fill-opacity='0.3'/%3E%3C/svg%3E")`,
        lattice: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30-30-30z' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-opacity='0.7'/%3E%3Ccircle cx='30' cy='30' r='3' fill='%23ffffff' fill-opacity='0.8'/%3E%3C/svg%3E")`,
        neural: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='5' fill='%23ffffff' fill-opacity='0.8'/%3E%3Ccircle cx='80' cy='30' r='4' fill='%23ffffff' fill-opacity='0.7'/%3E%3Ccircle cx='50' cy='80' r='5' fill='%23ffffff' fill-opacity='0.8'/%3E%3Cpath d='M20 20 L80 30 M80 30 L50 80 M50 80 L20 20' stroke='%23ffffff' stroke-width='2' stroke-opacity='0.6'/%3E%3C/svg%3E")`,
        custom: `url("data:image/svg+xml,%3Csvg width='60' height='104' viewBox='0 0 60 104' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 17.3v34.6L30 69.3 0 52V17.3L30 0zM30 104V69.3m0 0l30-17.3v-34.6L30 0 0 17.3v34.6l30 17.3z' fill='none' stroke='%23ffffff' stroke-width='2' stroke-opacity='0.7'/%3E%3C/svg%3E")`,
        circuit: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h100v100h-100z' fill='none' stroke='%23ffffff' stroke-width='2' stroke-opacity='0.8'/%3E%3Ccircle cx='10' cy='10' r='4' fill='%23ffffff' fill-opacity='0.9'/%3E%3Ccircle cx='110' cy='110' r='4' fill='%23ffffff' fill-opacity='0.9'/%3E%3Cpath d='M10 10l30 30m20-10l30 30m-60 10l30 30m10-50l30 30' stroke='%23ffffff' stroke-width='1.5' stroke-opacity='0.6'/%3E%3C/svg%3E")`,
        triangles: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 5l35 60H5z' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-opacity='0.7'/%3E%3C/svg%3E")`,
        waves: `url("data:image/svg+xml,%3Csvg width='120' height='60' viewBox='0 0 120 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 15 Q 30 5, 60 15 T 120 15 M0 30 Q 30 20, 60 30 T 120 30 M0 45 Q 30 35, 60 45 T 120 45' fill='none' stroke='%23ffffff' stroke-width='3' stroke-opacity='0.8'/%3E%3C/svg%3E")`
    }

    // Video & Voice Device States
    const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
    const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([])
    const [availableSpeakers, setAvailableSpeakers] = useState<MediaDeviceInfo[]>([])
    const [selectedCameraId, setSelectedCameraId] = useState<string>("")
    const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>("")
    const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("")
    const [isLoadingDevices, setIsLoadingDevices] = useState(false)

    // Notification States
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false)
    const [notificationSoundsEnabled, setNotificationSoundsEnabled] = useState(true)
    const [selectedMessageTone, setSelectedMessageTone] = useState("default")
    const [selectedGroupTone, setSelectedGroupTone] = useState("default")
    const [selectedCallRingtone, setSelectedCallRingtone] = useState("default")
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Custom Tones States
    const [customMessageTones, setCustomMessageTones] = useState<any[]>([])
    const [customGroupTones, setCustomGroupTones] = useState<any[]>([])
    const [customCallTones, setCustomCallTones] = useState<any[]>([])
    const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null)
    const [isUploadingTone, setIsUploadingTone] = useState<string | null>(null)
    const previewAudioRef = useRef<HTMLAudioElement | null>(null)

    // Privacy Settings States
    const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone')
    const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone')
    const [aboutPrivacy, setAboutPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone')
    const [statusPrivacy, setStatusPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone')
    const [groupsPrivacy, setGroupsPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone')
    const [readReceipts, setReadReceipts] = useState(true)
    const [disappearingMessagesDefault, setDisappearingMessagesDefault] = useState<'off' | '24h' | '7d' | '90d'>('off')

    // Friends Features States
    const [friendRequests, setFriendRequests] = useState<Array<{
        id: number
        name: string
        image: string
        timestamp: number
        type: 'incoming' | 'outgoing'
    }>>([
        { id: 101, name: "Alex Johnson", image: "https://i.pravatar.cc/150?img=11", timestamp: Date.now() - 3600000, type: 'incoming' },
        { id: 102, name: "Sarah Williams", image: "https://i.pravatar.cc/150?img=25", timestamp: Date.now() - 7200000, type: 'incoming' },
        { id: 103, name: "Mike Davis", image: "https://i.pravatar.cc/150?img=33", timestamp: Date.now() - 86400000, type: 'outgoing' },
    ])

    const [broadcastLists, setBroadcastLists] = useState<Array<{
        id: number
        name: string
        recipients: number[]
        lastUsed: number
    }>>([
        { id: 1, name: "Family", recipients: [1, 2], lastUsed: Date.now() - 86400000 },
        { id: 2, name: "Work Team", recipients: [3, 4, 5], lastUsed: Date.now() - 172800000 },
    ])

    const [groupInvites, setGroupInvites] = useState<Array<{
        id: number
        groupName: string
        groupImage: string
        inviter: string
        memberCount: number
        timestamp: number
    }>>([
        { id: 201, groupName: "Weekend Warriors", groupImage: "https://i.pravatar.cc/150?img=60", inviter: "John Doe", memberCount: 12, timestamp: Date.now() - 3600000 },
        { id: 202, groupName: "Book Club", groupImage: "https://i.pravatar.cc/150?img=61", inviter: "Jane Smith", memberCount: 8, timestamp: Date.now() - 7200000 },
    ])

    const [isCreatingBroadcastList, setIsCreatingBroadcastList] = useState(false)
    const [newBroadcastName, setNewBroadcastName] = useState("")
    const [selectedBroadcastRecipients, setSelectedBroadcastRecipients] = useState<number[]>([])

    const [callLogs, setCallLogs] = useState<Array<{
        id: number
        name: string
        image: string
        type: 'incoming' | 'outgoing' | 'missed'
        isVideo: boolean
        timestamp: number
        duration?: number
    }>>([
        { id: 1, name: "Alex Johnson", image: "https://i.pravatar.cc/150?img=11", type: 'incoming', isVideo: true, timestamp: Date.now() - 3600000, duration: 245 },
        { id: 2, name: "Sarah Williams", image: "https://i.pravatar.cc/150?img=25", type: 'missed', isVideo: false, timestamp: Date.now() - 7200000 },
        { id: 3, name: "Mike Davis", image: "https://i.pravatar.cc/150?img=33", type: 'outgoing', isVideo: false, timestamp: Date.now() - 86400000, duration: 120 },
        { id: 4, name: "John Doe", image: "https://i.pravatar.cc/150?img=12", type: 'missed', isVideo: true, timestamp: Date.now() - 172800000 },
    ])
    const [callLogFilter, setCallLogFilter] = useState<'all' | 'missed'>('all')

    // Load Settings
    useEffect(() => {
        const savedTheme = localStorage.getItem('chat-theme')
        const savedWallpaper = localStorage.getItem('chat-wallpaper')
        const savedStars = localStorage.getItem('chat-stars')
        const savedBrowserNotif = localStorage.getItem('browser-notifications')
        const savedSounds = localStorage.getItem('notification-sounds')
        const savedMessageTone = localStorage.getItem('message-tone')
        const savedGroupTone = localStorage.getItem('group-tone')
        const savedCallRingtone = localStorage.getItem('call-ringtone')

        if (savedTheme) setIsDarkMode(savedTheme === 'dark')
        if (savedWallpaper) setChatWallpaper(savedWallpaper)

        // State Migration for chat-stars: handle legacy boolean -> new pattern system
        if (savedStars) {
            if (savedStars === 'true') {
                setChatOverlayPattern('stars')
                localStorage.setItem('chat-stars', 'stars')
            } else if (savedStars === 'false') {
                setChatOverlayPattern('none')
                localStorage.setItem('chat-stars', 'none')
            } else {
                setChatOverlayPattern(savedStars as any)
            }
        }
        if (savedBrowserNotif !== null) setBrowserNotificationsEnabled(savedBrowserNotif === 'true')
        if (savedSounds !== null) setNotificationSoundsEnabled(savedSounds === 'true')
        if (savedMessageTone) setSelectedMessageTone(savedMessageTone)
        if (savedGroupTone) setSelectedGroupTone(savedGroupTone)
        if (savedCallRingtone) setSelectedCallRingtone(savedCallRingtone)

        // Load Custom Tones from IndexedDB
        const loadCustomTones = async () => {
            try {
                const tones = await audioDB.getAllTones();
                setCustomMessageTones(tones.filter(t => t.type === 'message'));
                setCustomGroupTones(tones.filter(t => t.type === 'group'));
                setCustomCallTones(tones.filter(t => t.type === 'call'));
            } catch (error) {
                console.error("Failed to load custom tones:", error);
            }
        };
        loadCustomTones();
    }, [])

    const toggleTheme = () => {
        const newMode = !isDarkMode
        setIsDarkMode(newMode)
        localStorage.setItem('chat-theme', newMode ? 'dark' : 'light')
    }

    const updateWallpaper = (color: string) => {
        setChatWallpaper(color)
        localStorage.setItem('chat-wallpaper', color)
    }

    const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" })
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const result = event.target?.result as string
            updateWallpaper(result)
            toast({ title: "Wallpaper Uploaded", description: "Successfully updated your chat background." })
        }
        reader.readAsDataURL(file)
    }

    const updateOverlayPattern = (pattern: typeof chatOverlayPattern) => {
        setChatOverlayPattern(pattern)
        localStorage.setItem('chat-stars', pattern)
    }

    const [isAddingBlockedContact, setIsAddingBlockedContact] = useState(false)



    const isOnlyEmoji = (text: string) => {
        if (!text.trim()) return false;
        const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\s)+$/;
        return emojiRegex.test(text.trim());
    };

    const renderTextWithLinks = (text: string, sender: string = 'them') => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "underline transition-colors break-all relative z-10 font-medium",
                            sender === 'me'
                                ? "text-white/90 hover:text-white decoration-white/40 hover:decoration-white"
                                : "text-warn hover:text-warn decoration-warn/40 hover:decoration-warn"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    useEffect(() => {
        if (selectedFriendId) {
            setIsTyping(true)
            const timer = setTimeout(() => setIsTyping(false), 1500)
            return () => clearTimeout(timer)
        }
    }, [selectedFriendId])

    useEffect(() => {
        const scrollContainer = scrollRef.current

        if (!scrollContainer) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
            setShowScrollButton(!isAtBottom)
        }

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
        return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (scrollRef.current && !showScrollButton) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }
    }, [selectedFriendId, messages, showScrollButton])

    const scrollToMessage = (msgId: number) => {
        const element = messageRefs.current[msgId]
        const container = scrollRef.current
        if (element && container) {
            const elementRect = element.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            const relativeTop = element.offsetTop - container.offsetTop

            container.scrollTo({
                top: relativeTop - (container.clientHeight / 2) + (element.clientHeight / 2),
                behavior: 'smooth'
            })

            element.classList.add('ring-2', 'ring-accent', 'ring-offset-2', 'ring-offset-canvas')
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-accent', 'ring-offset-2', 'ring-offset-canvas')
            }, 2000)
        }
    }

    // Call Handlers
    const startCall = (type: 'audio' | 'video') => {
        setCallType(type)
        setCallState('ringing')
        setCallDuration(0)
        setIsMuted(false)
        setIsSpeakerOn(false)
        setIsCameraPaused(false)

        // Simulate connection
        setTimeout(() => {
            setCallState('connected')
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1)
            }, 1000)
        }, 3000)
    }

    const endCall = () => {
        if (callTimerRef.current) clearInterval(callTimerRef.current)
        setCallState('ended')
        setTimeout(() => {
            setCallState('idle')
            setIsMuted(false)
            setIsSpeakerOn(false)
            setIsCameraPaused(false)
            setIsInviteModalOpen(false)
        }, 2000)
    }

    const handleInviteFriend = (friend: FriendItem) => {
        toast({
            title: "Invitation Sent",
            description: `You've invited ${friend.name} to the call.`,
        })
    }

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Friend Requests Handlers
    const handleAcceptFriendRequest = (requestId: number) => {
        const request = friendRequests.find(r => r.id === requestId)
        if (request) {
            setFriendRequests(prev => prev.filter(r => r.id !== requestId))
            toast({
                title: "Friend Request Accepted",
                description: `You are now friends with ${request.name}`,
            })
        }
    }

    const handleDeclineFriendRequest = (requestId: number) => {
        setFriendRequests(prev => prev.filter(r => r.id !== requestId))
        toast({
            title: "Friend Request Declined",
            description: "The request has been removed",
        })
    }

    const handleCancelFriendRequest = (requestId: number) => {
        setFriendRequests(prev => prev.filter(r => r.id !== requestId))
        toast({
            title: "Friend Request Cancelled",
            description: "Your request has been cancelled",
        })
    }

    // Broadcast Lists Handlers
    const handleCreateBroadcastList = () => {
        if (!newBroadcastName.trim() || selectedBroadcastRecipients.length === 0) {
            toast({
                title: "Invalid Broadcast List",
                description: "Please enter a name and select at least one recipient",
                variant: "destructive"
            })
            return
        }

        const newList = {
            id: Date.now(),
            name: newBroadcastName,
            recipients: selectedBroadcastRecipients,
            lastUsed: Date.now()
        }

        setBroadcastLists(prev => [newList, ...prev])
        setNewBroadcastName("")
        setSelectedBroadcastRecipients([])
        setIsCreatingBroadcastList(false)
        toast({
            title: "Broadcast List Created",
            description: `"${newBroadcastName}" has been created with ${selectedBroadcastRecipients.length} recipients`,
        })
    }

    const handleDeleteBroadcastList = (listId: number) => {
        const list = broadcastLists.find(l => l.id === listId)
        setBroadcastLists(prev => prev.filter(l => l.id !== listId))
        toast({
            title: "Broadcast List Deleted",
            description: `"${list?.name}" has been deleted`,
        })
    }

    // Group Invites Handlers
    const handleAcceptGroupInvite = (inviteId: number) => {
        const invite = groupInvites.find(i => i.id === inviteId)
        if (invite) {
            setGroupInvites(prev => prev.filter(i => i.id !== inviteId))
            toast({
                title: "Group Invite Accepted",
                description: `You've joined "${invite.groupName}"`,
            })
        }
    }

    const handleDeclineGroupInvite = (inviteId: number) => {
        const invite = groupInvites.find(i => i.id === inviteId)
        setGroupInvites(prev => prev.filter(i => i.id !== inviteId))
        toast({
            title: "Group Invite Declined",
            description: `You declined to join "${invite?.groupName}"`,
        })
    }

    // Device Management Functions
    const loadAvailableDevices = async () => {
        setIsLoadingDevices(true)
        try {
            // Request permissions first
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true })

            // Enumerate devices
            const devices = await navigator.mediaDevices.enumerateDevices()

            const cameras = devices.filter(device => device.kind === 'videoinput')
            const microphones = devices.filter(device => device.kind === 'audioinput')
            const speakers = devices.filter(device => device.kind === 'audiooutput')

            setAvailableCameras(cameras)
            setAvailableMicrophones(microphones)
            setAvailableSpeakers(speakers)

            // Load saved selections or use defaults
            const savedCamera = localStorage.getItem('selected-camera')
            const savedMic = localStorage.getItem('selected-microphone')
            const savedSpeaker = localStorage.getItem('selected-speaker')

            setSelectedCameraId(savedCamera || (cameras[0]?.deviceId || ""))
            setSelectedMicrophoneId(savedMic || (microphones[0]?.deviceId || ""))
            setSelectedSpeakerId(savedSpeaker || (speakers[0]?.deviceId || ""))
        } catch (error) {
            console.error('Error loading devices:', error)
            toast({
                title: "Permission Denied",
                description: "Please allow camera and microphone access to select devices.",
                variant: "destructive"
            })
        } finally {
            setIsLoadingDevices(false)
        }
    }

    const selectCamera = (deviceId: string) => {
        setSelectedCameraId(deviceId)
        localStorage.setItem('selected-camera', deviceId)
        toast({ title: "Camera Updated", description: "Your camera selection has been saved." })
    }

    const selectMicrophone = (deviceId: string) => {
        setSelectedMicrophoneId(deviceId)
        localStorage.setItem('selected-microphone', deviceId)
        toast({ title: "Microphone Updated", description: "Your microphone selection has been saved." })
    }

    const selectSpeaker = (deviceId: string) => {
        setSelectedSpeakerId(deviceId)
        localStorage.setItem('selected-speaker', deviceId)
        toast({ title: "Speaker Updated", description: "Your speaker selection has been saved." })
    }

    // Notification Management Functions
    const notificationTones = {
        message: {
            default: { name: 'Default', freq: 800 },
            bell: { name: 'Bell', freq: 1000 },
            chime: { name: 'Chime', freq: 1200 },
            ding: { name: 'Ding', freq: 1400 },
            pop: { name: 'Pop', freq: 600 },
            whistle: { name: 'Whistle', freq: 1600 }
        },
        group: {
            default: { name: 'Default', freq: 800 },
            bell: { name: 'Bell', freq: 1000 },
            chime: { name: 'Chime', freq: 1200 },
            ding: { name: 'Ding', freq: 1400 },
            pop: { name: 'Pop', freq: 600 },
            whistle: { name: 'Whistle', freq: 1600 }
        },
        call: {
            default: { name: 'Default', freq: 440 },
            pro_zen: { name: 'Pro Zen', freq: 600 },
            pro_echo: { name: 'Pro Echo', freq: 700 },
            pro_pulse: { name: 'Pro Pulse', freq: 800 }
        }
    }
    const playNotificationSound = async (toneType: 'message' | 'group' | 'call', forceToneId?: string) => {
        if (!notificationSoundsEnabled && !forceToneId) return

        // Stop any existing preview
        if (previewAudioRef.current) {
            previewAudioRef.current.pause()
            previewAudioRef.current = null
            setIsPlayingPreview(null)
        }

        const toneId = forceToneId || (toneType === 'message' ? selectedMessageTone : toneType === 'group' ? selectedGroupTone : selectedCallRingtone)

        // Check if it's a custom tone
        const customTones = toneType === 'message' ? customMessageTones : toneType === 'group' ? customGroupTones : customCallTones
        const customTone = customTones.find(t => t.id === toneId)

        if (customTone) {
            const url = URL.createObjectURL(customTone.blob)
            const audio = new Audio(url)
            audio.loop = (toneType === 'call')
            previewAudioRef.current = audio
            setIsPlayingPreview(toneId)

            audio.play().catch(e => console.error("Audio play failed:", e))

            audio.onended = () => {
                if (!audio.loop) {
                    setIsPlayingPreview(null)
                    previewAudioRef.current = null
                }
                URL.revokeObjectURL(url)
            }
            return
        }

        // Built-in tones
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

            if (toneType === 'call') {
                const toneConfig = notificationTones.call[toneId as keyof typeof notificationTones.call]
                const baseFreq = (toneConfig as any)?.freq || 440
                const duration = 20.0

                setIsPlayingPreview(toneId)

                const masterGain = audioContext.createGain()
                masterGain.connect(audioContext.destination)
                masterGain.gain.setValueAtTime(0.15, audioContext.currentTime)

                // Simple Delay/Reverb Effect
                const delay = audioContext.createDelay()
                delay.delayTime.value = 0.4
                const feedback = audioContext.createGain()
                feedback.gain.value = 0.3

                delay.connect(feedback)
                feedback.connect(delay)
                delay.connect(masterGain)

                const oscillators: (OscillatorNode | GainNode)[] = []

                const playNote = (freq: number, startTime: number, dur: number, type: OscillatorType = 'triangle') => {
                    const osc = audioContext.createOscillator()
                    const g = audioContext.createGain()

                    osc.type = type
                    osc.frequency.setValueAtTime(freq, startTime)

                    g.gain.setValueAtTime(0, startTime)
                    g.gain.linearRampToValueAtTime(0.1, startTime + 0.05)
                    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur)

                    osc.connect(g)
                    g.connect(masterGain)
                    g.connect(delay) // Connect to delay for richness

                    osc.start(startTime)
                    osc.stop(startTime + dur)
                    oscillators.push(osc)
                }

                const scheduleCycle = (start: number) => {
                    if (toneId === 'pro_zen') {
                        // Polyphonic Marimba/Chime
                        playNote(baseFreq, start, 1.5)
                        playNote(baseFreq * 1.25, start + 0.5, 1.5)
                        playNote(baseFreq * 1.5, start + 1.0, 1.5)
                        playNote(baseFreq * 2, start + 1.5, 1.0)
                        playNote(baseFreq * 1.5, start + 2.0, 1.0)
                        playNote(baseFreq * 1.25, start + 2.5, 1.0)
                    } else if (toneId === 'pro_echo') {
                        // Elegant Piano Chords
                        const root = baseFreq
                        playNote(root, start, 2, 'sine')
                        playNote(root * 1.5, start, 2, 'sine')
                        playNote(root * 2, start, 2, 'sine')

                        playNote(root * 1.25, start + 1, 2, 'sine')
                        playNote(root * 1.6, start + 1, 2, 'sine')
                        playNote(root * 2.5, start + 1, 2, 'sine')
                    } else if (toneId === 'pro_pulse') {
                        // Deep Synth Pulse
                        playNote(baseFreq * 0.5, start, 0.8, 'sawtooth')
                        playNote(baseFreq * 0.5, start + 0.5, 0.8, 'sawtooth')
                        playNote(baseFreq * 0.75, start + 1.0, 0.8, 'sawtooth')
                        playNote(baseFreq, start + 1.5, 1.0, 'sawtooth')
                    } else {
                        playNote(baseFreq, start, 0.5)
                        playNote(baseFreq * 1.2, start + 0.3, 0.5)
                    }
                }

                const now = audioContext.currentTime
                for (let i = 0; i < duration / 4; i++) {
                    scheduleCycle(now + (i * 4))
                }

                const stopSynthesized = () => {
                    oscillators.forEach(o => { try { if ('stop' in o) o.stop(); } catch (e) { } })
                    masterGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2)
                }

                (previewAudioRef.current as any) = { pause: stopSynthesized }

                setTimeout(() => {
                    if (isPlayingPreview === toneId) {
                        setIsPlayingPreview(null)
                        previewAudioRef.current = null
                    }
                }, duration * 1000)

                return
            }

            // Message/Group Tones (Short)
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            let frequency = 800
            let duration = 0.2

            const toneConfig = (notificationTones as any)[toneType][toneId]
            if (toneConfig) {
                frequency = toneConfig.freq
            }

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = frequency
            oscillator.type = 'sine'

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + duration)

            if (forceToneId) setIsPlayingPreview(forceToneId)
            setTimeout(() => {
                if (forceToneId) setIsPlayingPreview(null)
            }, duration * 1000)
        } catch (error) {
            console.error('Error playing notification sound:', error)
        }
    }

    const stopPreview = () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause()
            previewAudioRef.current = null
        }
        setIsPlayingPreview(null)
    }

    const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'message' | 'group' | 'call') => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('audio/')) {
            toast({ title: "Invalid File", description: "Please upload an audio file.", variant: "destructive" })
            return
        }

        const id = `custom-${Date.now()}`
        const name = file.name.split('.')[0]

        try {
            await audioDB.saveTone(id, name, file, type)
            const newTone = { id, name, blob: file, type, createdAt: Date.now() }

            if (type === 'message') {
                setCustomMessageTones(prev => [...prev, newTone])
                setSelectedMessageTone(id)
                localStorage.setItem('message-tone', id)
            } else if (type === 'group') {
                setCustomGroupTones(prev => [...prev, newTone])
                setSelectedGroupTone(id)
                localStorage.setItem('group-tone', id)
            } else if (type === 'call') {
                setCustomCallTones(prev => [...prev, newTone])
                setSelectedCallRingtone(id)
                localStorage.setItem('call-ringtone', id)
            }

            toast({ title: "Tone Uploaded", description: `"${name}" has been added to your tones.` })
            playNotificationSound(type, id)
        } catch (error) {
            console.error("Upload failed:", error)
            toast({ title: "Upload Failed", description: "Could not save audio file.", variant: "destructive" })
        }
    }

    const deleteCustomTone = async (id: string, type: 'message' | 'group' | 'call') => {
        try {
            await audioDB.deleteTone(id)

            if (type === 'message') {
                setCustomMessageTones(prev => prev.filter(t => t.id !== id))
                if (selectedMessageTone === id) setSelectedMessageTone('default')
            } else if (type === 'group') {
                setCustomGroupTones(prev => prev.filter(t => t.id !== id))
                if (selectedGroupTone === id) setSelectedGroupTone('default')
            } else if (type === 'call') {
                setCustomCallTones(prev => prev.filter(t => t.id !== id))
                if (selectedCallRingtone === id) setSelectedCallRingtone('default')
            }

            toast({ title: "Tone Deleted", description: "Custom tone has been removed." })
        } catch (error) {
            console.error("Delete failed:", error)
        }
    }

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            toast({
                title: "Not Supported",
                description: "Browser notifications are not supported in this browser.",
                variant: "destructive"
            })
            return false
        }

        if (Notification.permission === 'granted') {
            setBrowserNotificationsEnabled(true)
            localStorage.setItem('browser-notifications', 'true')
            toast({ title: "Enabled", description: "Browser notifications are enabled." })
            return true
        }

        if (Notification.permission === 'denied') {
            toast({
                title: "Permission Denied",
                description: "Please enable notifications in your browser settings.",
                variant: "destructive"
            })
            return false
        }

        try {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                setBrowserNotificationsEnabled(true)
                localStorage.setItem('browser-notifications', 'true')
                toast({ title: "Enabled", description: "Browser notifications are enabled." })
                return true
            } else {
                setBrowserNotificationsEnabled(false)
                localStorage.setItem('browser-notifications', 'false')
                toast({
                    title: "Permission Denied",
                    description: "Browser notifications were not enabled.",
                    variant: "destructive"
                })
                return false
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error)
            return false
        }
    }

    const showBrowserNotification = (title: string, body: string, icon?: string) => {
        if (!browserNotificationsEnabled || Notification.permission !== 'granted') return

        try {
            const notification = new Notification(title, {
                body,
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'chat-notification',
                renotify: true
            })

            notification.onclick = () => {
                window.focus()
                notification.close()
            }
        } catch (error) {
            console.error('Error showing notification:', error)
        }
    }

    const toggleBrowserNotifications = async () => {
        if (!browserNotificationsEnabled) {
            await requestNotificationPermission()
        } else {
            setBrowserNotificationsEnabled(false)
            localStorage.setItem('browser-notifications', 'false')
            toast({ title: "Disabled", description: "Browser notifications are disabled." })
        }
    }

    const toggleNotificationSounds = () => {
        const newValue = !notificationSoundsEnabled
        setNotificationSoundsEnabled(newValue)
        localStorage.setItem('notification-sounds', newValue.toString())
        toast({
            title: newValue ? "Enabled" : "Disabled",
            description: `Notification sounds are ${newValue ? 'enabled' : 'disabled'}.`
        })
    }

    const selectMessageTone = (toneId: string) => {
        setSelectedMessageTone(toneId)
        localStorage.setItem('message-tone', toneId)
        playNotificationSound('message')
    }

    const selectGroupTone = (toneId: string) => {
        setSelectedGroupTone(toneId)
        localStorage.setItem('group-tone', toneId)
        playNotificationSound('group')
    }

    const selectCallRingtone = (toneId: string) => {
        setSelectedCallRingtone(toneId)
        localStorage.setItem('call-ringtone', toneId)
        playNotificationSound('call')
    }


    // Voice Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            mediaRecorderRef.current = recorder
            chunksRef.current = []
            setRecordedVoice(null)

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            const startTime = Date.now()
            recorder.onstop = () => {
                const endTime = Date.now()
                const finalDuration = Math.round((endTime - startTime) / 1000)
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                const url = URL.createObjectURL(blob)
                setRecordedVoice({ url, duration: finalDuration })
                stream.getTracks().forEach(track => track.stop())
            }

            recorder.start()
            setIsRecording(true)
            setRecordingTime(0)
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)
        } catch (err) {
            console.error("Error accessing microphone:", err)
            alert("Microphone access denied or not available.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    const sendRecordedVoice = () => {
        if (recordedVoice) {
            handleSendMessage(`Voice Message (${recordedVoice.duration}s)`, 'voice', recordedVoice.url)
            setRecordedVoice(null)
            setRecordingTime(0)
        }
    }

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = null
            mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
        setRecordedVoice(null)
        setRecordingTime(0)
        if (timerRef.current) clearInterval(timerRef.current)
        if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        }
    }

    // Camera Logic
    const openCamera = async (purpose: 'message' | 'group_creation' | 'group_update' = 'message') => {
        // Ensure purpose is a string, if event is passed (when called from onClick without args), default to 'message'
        const validPurpose = (typeof purpose === 'string') ? purpose : 'message'
        setCameraPurpose(validPurpose)
        setIsCameraOpen(true)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            if (videoRef.current) videoRef.current.srcObject = stream
        } catch (err) {
            console.error("Error accessing camera:", err)
            setIsCameraOpen(false)
            alert("Camera access denied or not available.")
        }
    }

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas")
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight

            const ctx = canvas.getContext("2d")
            // Mirror the context if we want the captured image to match the mirrored preview
            ctx?.translate(canvas.width, 0)
            ctx?.scale(-1, 1)

            ctx?.drawImage(videoRef.current, 0, 0)
            const url = canvas.toDataURL("image/jpeg")
            setCapturedImage(url)
            setIsImageFromGallery(false)
        }
    }

    useEffect(() => {
        if (capturedImage && editorCanvasRef.current) {
            const img = new Image();
            img.src = capturedImage;
            img.onload = () => {
                if (editorCanvasRef.current) {
                    editorCanvasRef.current.width = img.width;
                    editorCanvasRef.current.height = img.height;
                }
            };
        }
    }, [capturedImage]);

    const confirmSendPhoto = async () => {
        if (!capturedImage) return

        // Create a temporary canvas to merge everything (filters + drawings)
        const tempCanvas = document.createElement("canvas")
        const img = new Image()
        img.src = capturedImage
        await new Promise((resolve) => (img.onload = resolve))

        tempCanvas.width = img.width
        tempCanvas.height = img.height
        const tempCtx = tempCanvas.getContext("2d")
        if (!tempCtx) return

        // Apply filters to temp canvas
        if (appliedFilter && appliedFilter !== 'none') {
            tempCtx.filter = appliedFilter
        }
        tempCtx.drawImage(img, 0, 0)

        // Draw drawing overlay onto temp canvas
        if (editorCanvasRef.current) {
            tempCtx.filter = 'none'
            tempCtx.drawImage(editorCanvasRef.current, 0, 0, tempCanvas.width, tempCanvas.height)
        }

        // Now create the final (possibly cropped) canvas
        const finalCanvas = document.createElement("canvas")
        const cropX = (cropArea.x / 100) * tempCanvas.width
        const cropY = (cropArea.y / 100) * tempCanvas.height
        const cropW = (cropArea.width / 100) * tempCanvas.width
        const cropH = (cropArea.height / 100) * tempCanvas.height

        finalCanvas.width = cropW
        finalCanvas.height = cropH
        const finalCtx = finalCanvas.getContext("2d")
        if (!finalCtx) return

        // Extract the cropped portion from tempCanvas
        finalCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

        const finalUrl = finalCanvas.toDataURL("image/jpeg", 0.9)

        if (cameraPurpose === 'message') {
            handleSendMessage("Photo", 'image', finalUrl)
        } else if (cameraPurpose === 'group_creation') {
            setNewGroupImage(finalUrl)
        } else if (cameraPurpose === 'group_update' && selectedFriendId) {
            handleUpdateGroupImage(selectedFriendId, finalUrl)
        }
        closeCamera()
        setCropArea({ x: 10, y: 10, width: 80, height: 80 }) // Reset crop for next time
    }

    const handleCropResize = (handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w', info: any) => {
        const rect = editorImageRef.current?.getBoundingClientRect();
        if (!rect) return;

        const dx = (info.delta.x / rect.width) * 100;
        const dy = (info.delta.y / rect.height) * 100;

        setCropArea(prev => {
            let { x, y, width, height } = prev;

            if (handle === 'nw') {
                const newX = Math.max(0, Math.min(x + width - 5, x + dx));
                const newY = Math.max(0, Math.min(y + height - 5, y + dy));
                width = width + (x - newX);
                height = height + (y - newY);
                x = newX;
                y = newY;
            } else if (handle === 'ne') {
                width = Math.max(5, Math.min(100 - x, width + dx));
                const newY = Math.max(0, Math.min(y + height - 5, y + dy));
                height = height + (y - newY);
                y = newY;
            } else if (handle === 'sw') {
                const newX = Math.max(0, Math.min(x + width - 5, x + dx));
                width = width + (x - newX);
                x = newX;
                height = Math.max(5, Math.min(100 - y, height + dy));
            } else if (handle === 'se') {
                width = Math.max(5, Math.min(100 - x, width + dx));
                height = Math.max(5, Math.min(100 - y, height + dy));
            } else if (handle === 'n') {
                const newY = Math.max(0, Math.min(y + height - 5, y + dy));
                height = height + (y - newY);
                y = newY;
            } else if (handle === 's') {
                height = Math.max(5, Math.min(100 - y, height + dy));
            } else if (handle === 'e') {
                width = Math.max(5, Math.min(100 - x, width + dx));
            } else if (handle === 'w') {
                const newX = Math.max(0, Math.min(x + width - 5, x + dx));
                width = width + (x - newX);
                x = newX;
            }

            return { x, y, width, height };
        });
    };

    const retakePhoto = () => {
        setCapturedImage(null)
    }

    const closeCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
        }
        setIsCameraOpen(false)
        setCapturedImage(null)
        setIsImageFromGallery(false)
        setActiveEditorTool(null)
        setAppliedFilter('none')
        clearCanvas()
    }

    // Canvas Drawing Functions
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = editorCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = editorCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = editorCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // File Handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file' | 'video' | 'voice') => {
        const file = e.target.files?.[0]
        if (!file) return

        let actualType = type
        if (file.type.startsWith('video/')) {
            actualType = 'video'
        } else if (file.type.startsWith('image/')) {
            actualType = 'image'
        } else if (file.type.startsWith('audio/')) {
            actualType = 'voice'
        }

        const url = URL.createObjectURL(file)

        if (actualType === 'image') {
            setCapturedImage(url)
            setIsImageFromGallery(true)
            setIsCameraOpen(true)
            setCameraPurpose('message')
        } else {
            handleSendMessage(file.name, actualType, url)
        }
    }

    const myFriends = useMemo(() => {
        // Base list - DO NOT exclude blocked users (showing them in list now)
        let list = friendsList;

        if (activeView === 'archived') {
            list = friendsList.filter(u => u.isArchived);
        } else if (activeView === 'favorites') {
            list = friendsList.filter(u => u.isFavourite && !u.isArchived);
        } else {
            // 'all' view: show unarchived
            list = friendsList.filter(u => !u.isArchived);

            // Apply Sub-filters (Chips)
            if (filterType === 'unread') {
                list = list.filter(u => (u.unreadCount || 0) > 0 || u.isUnread);
            } else if (filterType === 'groups') {
                list = list.filter(u => u.isGroup);
            }
        }

        // Sort: Pinned first, then by last message time (descending)
        return list.sort((a, b) => {
            if (activeView === 'all') {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
            }

            // Get last message IDs for sorting
            const msgsA = messages[a.id] || [];
            const msgsB = messages[b.id] || [];
            const lastA = msgsA.length > 0 ? msgsA[msgsA.length - 1].id : 0;
            const lastB = msgsB.length > 0 ? msgsB[msgsB.length - 1].id : 0;

            return lastB - lastA;
        });
    }, [friendsList, activeView, filterType, messages])

    // Sidebar Notifications: Show dot if ANY chat in category is unread (unreadCount > 0 OR isUnread manually)
    const hasArchivedUnread = useMemo(() => friendsList.some(u => u.isArchived && ((u.unreadCount || 0) > 0 || u.isUnread)), [friendsList]);
    const hasFavoritesUnread = useMemo(() => friendsList.some(u => u.isFavourite && !u.isArchived && ((u.unreadCount || 0) > 0 || u.isUnread)), [friendsList]);

    const filteredFriends = useMemo(() => {
        return myFriends.filter(friend =>
            friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            friend.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [myFriends, searchQuery])

    const selectedFriend = useMemo<FriendItem | null>(() => {
        if (globalSearchResult && globalSearchResult !== "not_found") return globalSearchResult as FriendItem
        return friendsList.find(u => u.id === selectedFriendId) || null
    }, [selectedFriendId, globalSearchResult, friendsList])

    const groupsInCommon = useMemo(() => {
        if (!selectedFriend || selectedFriend.isGroup) return [];
        return friendsList.filter(f =>
            f.isGroup &&
            f.memberIds?.includes(selectedFriend.id) &&
            f.memberIds?.includes(12345)
        );
    }, [selectedFriend, friendsList]);

    const handleGlobalSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const emailToSearch = isAddingFriend ? addEmail : searchQuery
        if (!emailToSearch.trim()) return

        setIsSearchingGlobal(true)
        setGlobalSearchResult(null)

        // Simulate API delay
        setTimeout(() => {
            const result = DUMMY_USERS.find(u => u.email.toLowerCase() === emailToSearch.toLowerCase() && !u.isFriend)
            if (result) {
                setGlobalSearchResult(result)
                setSelectedFriendId(null)
            } else {
                setGlobalSearchResult("not_found")
                setSelectedFriendId(null)
            }
            setIsSearchingGlobal(false)
        }, 600)
    }

    const selectFriend = (id: number) => {
        if (isMultiSelectMode) {
            toggleChatSelection(id)
            return
        }
        setSelectedFriendId(id)
        setGlobalSearchResult(null)
        setIsAddingFriend(false)
        // Mark as read on select
        setFriendsList(prev => prev.map(f => f.id === id ? { ...f, unreadCount: 0, isUnread: false } : f))
    }

    const toggleChatSelection = (id: number) => {
        setSelectedChatIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const togglePinFriend = (id: number) => {
        setFriendsList(prev => {
            const list = prev.map(f => f.id === id ? { ...f, isPinned: !f.isPinned } : f);
            return [...list].sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });
        });
        toast({ title: "Updated", description: "Chat pin status updated." });
    }

    const toggleMuteFriend = (id: number) => {
        setFriendsList(prev => prev.map(f => f.id === id ? { ...f, isMuted: !f.isMuted } : f));
        toast({ title: "Updated", description: "Mute settings updated." });
    }

    const archiveFriend = (id: number) => {
        setFriendsList(prev => prev.map(f => f.id === id ? { ...f, isArchived: !f.isArchived } : f)); // Toggle archive
        const action = friendsList.find(f => f.id === id)?.isArchived ? "Unarchived" : "Archived";
        toast({ title: action, description: `Chat ${action.toLowerCase()}.` });
        if (selectedFriendId === id) setSelectedFriendId(null);
    }

    const toggleFavouriteFriend = (id: number) => {
        setFriendsList(prev => prev.map(f => f.id === id ? { ...f, isFavourite: !f.isFavourite } : f));
        toast({ title: "Updated", description: "Favorites updated." });
    }

    const confirmDeleteChat = (friend: FriendItem) => {
        setFriendDeleteConfirm(friend);
    }

    const handleDeleteChatConfirmed = () => {
        if (!friendDeleteConfirm) return;
        setFriendsList(prev => prev.filter(f => f.id !== friendDeleteConfirm.id));
        if (selectedFriendId === friendDeleteConfirm.id) setSelectedFriendId(null);
        toast({ title: "Deleted", description: "Chat deleted permanently." });
        setFriendDeleteConfirm(null);
    }

    const confirmBlockUser = (friend: FriendItem) => {
        setBlockConfirm(friend);
    }

    const handleBlockUserConfirmed = () => {
        if (!blockConfirm) return;
        toast({ title: "Blocked", description: `${blockConfirm.name} has been blocked.` });
        setBlockConfirm(null);
        // In a real app, we'd add to a blocked list and maybe remove from friends
    }

    const toggleReadStatus = (id: number) => {
        setFriendsList(prev => prev.map(f => {
            if (f.id !== id) return f;
            // If has unread count OR is mutually unread -> Mark as Read
            if ((f.unreadCount || 0) > 0 || f.isUnread) {
                return { ...f, unreadCount: 0, isUnread: false };
            }
            // Else -> Mark as Unread
            return { ...f, isUnread: true };
        }));

        // Show toast based on new state? Need to check state post-update or infer
        // For simplicity, we just updated. We can infer what we did by checking previous state but 
        // inside the setter is better or finding first.
        const friend = friendsList.find(f => f.id === id);
        const wasUnread = (friend?.unreadCount || 0) > 0 || friend?.isUnread;
        toast({
            title: wasUnread ? "Marked as read" : "Marked as unread",
            description: wasUnread ? "Chat marked as read." : "Chat marked as unread."
        });
    }

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji)
    }

    const handleMessageReaction = (msgId: number, emoji: string) => {
        if (!selectedFriendId) return
        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: prev[selectedFriendId].map(msg => {
                if (msg.id === msgId) {
                    // Toggle reaction: if same emoji, remove it; else set it
                    return { ...msg, reaction: msg.reaction === emoji ? null : emoji }
                }
                return msg
            })
        }))
        setOpenContextMenuId(null) // Close the context menu after reaction
    }

    const handleSendMessage = (text: string = newMessage, type: 'text' | 'voice' | 'image' | 'file' | 'video' = 'text', mediaUrl?: string, replyTo?: any) => {
        if ((!text.trim() && !mediaUrl) || !selectedFriendId) return

        const msg = {
            id: Date.now(),
            text: text,
            type: type,
            mediaUrl: mediaUrl,
            sender: 'me' as const,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isStarred: false,
            isPinned: false,
            isDeleted: false,
            deletedForMe: false,
            replyTo: replyTo || replyingTo
        }

        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: [...(prev[selectedFriendId] || []), msg]
        }))
        if (type === 'text') setNewMessage("")
        setReplyingTo(null)
    }

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) {
            toast({ title: "Error", description: "Group name is required", variant: "destructive" })
            return
        }
        if (selectedGroupMembers.length === 0) {
            toast({ title: "Error", description: "Select at least one member", variant: "destructive" })
            return
        }

        const newGroup: FriendItem = {
            id: Date.now(),
            name: newGroupName,
            email: "group@chat",
            image: newGroupImage || `https://ui-avatars.com/api/?name=${newGroupName}&background=random`,
            isFriend: true,
            status: "online",
            lastSeen: "Just now",
            bio: `${selectedGroupMembers.length} members`,
            isGroup: true,
            unreadCount: 0,
            isUnread: false,
            memberIds: [12345, ...selectedGroupMembers], // 12345 as dummy "Me" ID or similar
            adminIds: [12345],
            description: "",
            createdAt: new Date().toLocaleDateString(),
            groupSettings: {
                onlyAdminsCanEditInfo: false,
                onlyAdminsCanAddMembers: false,
                onlyAdminsCanSendMessages: false
            },
            creatorId: 12345
        }

        const creationMsg: any = {
            id: Date.now(),
            text: `You created group "${newGroupName}"`,
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }

        const addedMessages = selectedGroupMembers.map((id, index) => {
            const friend = friendsList.find(f => f.id === id)
            return {
                id: Date.now() + 2 + index,
                text: `You added ${friend?.name || 'a friend'}`,
                type: 'text',
                sender: 'me',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSystem: true
            }
        })

        setFriendsList(prev => [newGroup, ...prev])
        setMessages(prev => ({ ...prev, [newGroup.id]: [creationMsg, ...addedMessages] }))
        setSelectedFriendId(newGroup.id)

        setIsCreatingGroup(false)
        setGroupStep(1)
        setNewGroupName("")
        setNewGroupImage(null)
        setSelectedGroupMembers([])

        toast({ title: "Success", description: `Group "${newGroupName}" created!` })
    }

    const handleUpdateGroupImage = (groupId: number, imageUrl: string) => {
        setFriendsList(prev => prev.map(f => {
            if (f.id === groupId) {
                return { ...f, image: imageUrl }
            }
            return f
        }))

        // Add system message
        const updateMsg: any = {
            id: Date.now(),
            text: `Admin changed the group profile picture`,
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }
        setMessages(prev => ({
            ...prev,
            [groupId]: [...(prev[groupId] || []), updateMsg]
        }))

        toast({ title: "Updated", description: "Group profile picture has been updated." })
    }

    const handleForward = () => {
        if (!isForwarding || forwardTargets.length === 0) return

        setMessages(prev => {
            const next = { ...prev }
            forwardTargets.forEach(targetId => {
                // Ensure isForwarding is an array
                const messagesToForward = Array.isArray(isForwarding) ? isForwarding : [isForwarding];

                messagesToForward.forEach((msg, index) => {
                    const forwardMsg = {
                        ...msg,
                        id: Date.now() + Math.random() + index,
                        sender: 'me',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isForwarded: true
                    }
                    next[targetId] = [...(next[targetId] || []), forwardMsg]
                })
            })
            return next
        })

        toast({
            title: "Forwarded",
            description: `${isForwarding.length} message(s) forwarded to ${forwardTargets.length} contact(s).`
        })
        setIsForwarding(null)
        setForwardTargets([])
        exitSelectMode()
    }

    const deleteForMe = (msgId: number) => {
        if (!selectedFriendId) return
        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: prev[selectedFriendId].map(msg =>
                msg.id === msgId ? { ...msg, deletedForMe: true } : msg
            )
        }))
        toast({ title: "Deleted", description: "Message deleted for you." })
    }

    const deleteForEveryone = (msgId: number) => {
        if (!selectedFriendId) return
        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: prev[selectedFriendId].map(msg =>
                msg.id === msgId ? { ...msg, isDeleted: true, text: "This message was deleted" } : msg
            )
        }))
        toast({ title: "Deleted for Everyone", description: "Message deleted for all participants." })
    }

    const toggleStar = (msgId: number) => {
        if (!selectedFriendId) return
        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: prev[selectedFriendId].map(msg =>
                msg.id === msgId ? { ...msg, isStarred: !msg.isStarred } : msg
            )
        }))
    }

    const togglePin = (msgId: number) => {
        if (!selectedFriendId) return
        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: prev[selectedFriendId].map(msg =>
                msg.id === msgId ? { ...msg, isPinned: !msg.isPinned } : msg
            )
        }))
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({ title: "Copied", description: "Message copied to clipboard." })
    }

    const toggleMessageSelection = (msgId: number) => {
        setSelectedMessageIds(prev =>
            prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
        )
    }

    const enterSelectMode = (initialMsgId: number) => {
        setIsSelectMode(true)
        setSelectedMessageIds([initialMsgId])
    }

    const exitSelectMode = () => {
        setIsSelectMode(false)
        setSelectedMessageIds([])
    }

    const handleBulkCopy = () => {
        if (!selectedFriendId) return
        const text = (messages[selectedFriendId] || [])
            .filter(m => selectedMessageIds.includes(m.id))
            .map(m => m.text)
            .join('\n')
        copyToClipboard(text)
        exitSelectMode()
    }

    const handleBulkDelete = (type: 'me' | 'everyone') => {
        if (!selectedFriendId) return
        const ids = [...selectedMessageIds]

        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: prev[selectedFriendId].map(msg => {
                if (ids.includes(msg.id)) {
                    if (type === 'everyone' && msg.sender === 'me') {
                        return { ...msg, isDeleted: true, text: "This message was deleted" }
                    } else {
                        return { ...msg, deletedForMe: true }
                    }
                }
                return msg
            })
        }))

        toast({
            title: type === 'everyone' ? "Deleted for Everyone" : "Deleted",
            description: `${ids.length} message(s) deleted.`
        })
        setBulkDeleteConfirm(null)
        exitSelectMode()
    }

    const handleBulkForward = () => {
        if (!selectedFriendId) return
        const msgsToForward = (messages[selectedFriendId] || [])
            .filter(m => selectedMessageIds.includes(m.id))

        if (msgsToForward.length > 0) {
            setIsForwarding(msgsToForward)
        }
    }

    const forwardMessage = (msg: any) => {
        setIsForwarding([msg])
    }

    const handleSimulation = (type: 'voice' | 'image' | 'file' | 'emoji') => {
        if (!selectedFriendId) return
        if (type === 'emoji') {
            handleSendMessage("😊", 'text')
            return
        }
        // Others are handled via real components now
    }

    const handleUpdateGroupName = () => {
        if (!tempGroupName.trim() || !selectedFriendId) return
        setFriendsList(prev => prev.map(f =>
            f.id === selectedFriendId ? { ...f, name: tempGroupName } : f
        ))
        setIsEditingGroupName(false)
        toast({ title: "Updated", description: "Group name has been updated." })
    }

    const handleToggleFavoriteGroup = (id: number) => {
        setFriendsList(prev => prev.map(f =>
            f.id === id ? { ...f, isFavourite: !f.isFavourite } : f
        ))
        const friend = friendsList.find(f => f.id === id)
        toast({
            title: friend?.isFavourite ? "Removed from Favorites" : "Added to Favorites",
            description: `${friend?.name} has been ${friend?.isFavourite ? 'removed from' : 'added to'} your favorites.`
        })
    }

    const handleUpdateGroupDescription = () => {
        if (!selectedFriendId) return
        setFriendsList(prev => prev.map(f =>
            f.id === selectedFriendId ? { ...f, description: tempDescription } : f
        ))
        setIsEditingDescription(false)
        toast({ title: "Updated", description: "Group description has been updated." })
    }

    const handleExitGroup = (id: number) => {
        const group = friendsList.find(f => f.id === id)
        if (!group) return

        // Check if user is admin
        const isAdmin = group.adminIds?.includes(12345)

        // Count other admins
        const otherAdmins = group.adminIds?.filter(aid => aid !== 12345) || []

        if (isAdmin && (group.memberIds?.length || 0) > 1 && otherAdmins.length === 0) {
            // Only need to transfer if you are an admin AND you are the LAST admin AND there are other members
            setIsTransferringAdmin(true)
            return
        }

        // Just exit
        setFriendsList(prev => prev.map(f =>
            f.id === id ? { ...f, isExited: true } : f
        ))

        // Add system message
        const exitMsg: any = {
            id: Date.now(),
            text: "You left the group",
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }
        setMessages(prev => ({ ...prev, [id]: [...(prev[id] || []), exitMsg] }))

        setShowGroupInfo(false)
        toast({ title: "Group Exited", description: "You have left the group." })
    }

    const handleTransferAdminAndExit = (newAdminId: number) => {
        if (!selectedFriendId) return

        setFriendsList(prev => prev.map(f => {
            if (f.id === selectedFriendId) {
                return {
                    ...f,
                    adminIds: [...(f.adminIds || []).filter(aid => aid !== 12345), newAdminId],
                    isExited: true
                }
            }
            return f
        }))

        // Add system messages
        const transferMsg: any = {
            id: Date.now(),
            text: "You transferred admin and left",
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }
        setMessages(prev => ({ ...prev, [selectedFriendId]: [...(prev[selectedFriendId] || []), transferMsg] }))

        setIsTransferringAdmin(false)
        setShowGroupInfo(false)
        toast({ title: "Success", description: "Admin transferred and group exited." })
    }

    const handleReportGroup = (name: string) => {
        setIsReportModalOpen(true)
    }

    const submitReport = () => {
        if (!reportReason.trim()) return
        toast({ title: "Reported", description: `Group has been reported for: ${reportReason}` })
        setIsReportModalOpen(false)
        setReportReason("")
    }

    const handleReportFriend = (friend: FriendItem) => {
        setReportFriend(friend)
        setFriendReportReason("")
    }

    const submitFriendReport = () => {
        if (!friendReportReason.trim() || !reportFriend) return
        toast({ title: "Reported", description: `${reportFriend.name} has been reported for: ${friendReportReason}` })
        setReportFriend(null)
        setFriendReportReason("")
    }

    const handleClearChat = (chatId: number) => {
        setMessages(prev => ({
            ...prev,
            [chatId]: []
        }))
        setClearChatConfirm(null)
        toast({ title: "Chat Cleared", description: "All messages have been deleted from this chat." })
    }

    const handleRemoveMember = (groupId: number, memberId: number) => {
        const group = friendsList.find(f => f.id === groupId)
        if (!group) return

        // Creator Protection: Cannot remove the creator
        if (memberId === group.creatorId) {
            toast({ title: "Operation Denied", description: "The group creator cannot be removed.", variant: "destructive" })
            return
        }

        const member = friendsList.find(f => f.id === memberId) || (memberId === 12345 ? { name: "You" } : null)
        if (!member) return

        setFriendsList(prev => prev.map(f => {
            if (f.id === groupId) {
                return {
                    ...f,
                    memberIds: f.memberIds?.filter(id => id !== memberId),
                    adminIds: f.adminIds?.filter(id => id !== memberId)
                }
            }
            return f
        }))

        // Add system message
        const removeMsg: any = {
            id: Date.now(),
            text: `Admin removed ${member.name}`,
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }
        setMessages(prev => ({
            ...prev,
            [groupId]: [...(prev[groupId] || []), removeMsg]
        }))

        toast({ title: "Removed", description: `${member.name} has been removed from the group.` })
    }

    const handlePromoteToAdmin = (groupId: number, memberId: number) => {
        const group = friendsList.find(f => f.id === groupId)
        if (!group) return

        const member = friendsList.find(f => f.id === memberId) || (memberId === 12345 ? { name: "You" } : null)
        if (!member) return

        setFriendsList(prev => prev.map(f => {
            if (f.id === groupId) {
                if (f.adminIds?.includes(memberId)) return f
                return {
                    ...f,
                    adminIds: [...(f.adminIds || []), memberId]
                }
            }
            return f
        }))

        // Add system message
        const promoteMsg: any = {
            id: Date.now(),
            text: `Admin promoted ${member.name} to admin`,
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }
        setMessages(prev => ({
            ...prev,
            [groupId]: [...(prev[groupId] || []), promoteMsg]
        }))

        toast({ title: "Promoted", description: `${member.name} is now a group admin.` })
    }

    const handleDemoteAdmin = (groupId: number, memberId: number) => {
        const group = friendsList.find(f => f.id === groupId)
        if (!group) return

        if (memberId === group.creatorId) {
            toast({ title: "Operation Denied", description: "The group creator cannot be demoted.", variant: "destructive" })
            return
        }

        const member = friendsList.find(f => f.id === memberId) || (memberId === 12345 ? { name: "You" } : null)
        if (!member) return

        setFriendsList(prev => prev.map(f => {
            if (f.id === groupId) {
                return {
                    ...f,
                    adminIds: f.adminIds?.filter(id => id !== memberId)
                }
            }
            return f
        }))

        // Add system message
        const demoteMsg: any = {
            id: Date.now(),
            text: `Admin dismissed ${member.name} as admin`,
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }
        setMessages(prev => ({
            ...prev,
            [groupId]: [...(prev[groupId] || []), demoteMsg]
        }))

        toast({ title: "Demoted", description: `${member.name} is no longer a group admin.` })
    }

    const handleToggleGroupPermission = (groupId: number, permission: 'onlyAdminsCanEditInfo' | 'onlyAdminsCanAddMembers' | 'onlyAdminsCanSendMessages') => {
        setFriendsList(prev => prev.map(f => {
            if (f.id === groupId) {
                const settings = f.groupSettings || { onlyAdminsCanEditInfo: false, onlyAdminsCanAddMembers: false, onlyAdminsCanSendMessages: false }
                return {
                    ...f,
                    groupSettings: {
                        ...settings,
                        [permission]: !settings[permission]
                    }
                }
            }
            return f
        }))

        const group = friendsList.find(f => f.id === groupId)
        const isNowEnabled = !group?.groupSettings?.[permission]

        let desc = "";
        let sysText = "";
        if (permission === 'onlyAdminsCanEditInfo') {
            desc = "Edit information";
            sysText = isNowEnabled ? "Admin restricted editing group info to admins only" : "Admin allowed everyone to edit group info";
        }
        else if (permission === 'onlyAdminsCanAddMembers') {
            desc = "Add members";
            sysText = isNowEnabled ? "Admin restricted adding members to admins only" : "Admin allowed everyone to add members";
        }
        else if (permission === 'onlyAdminsCanSendMessages') {
            desc = "Send messages";
            sysText = isNowEnabled ? "Admin restricted sending messages to admins only" : "Admin allowed everyone to send messages";
        }

        // Add system message
        const sysMsg: any = {
            id: Date.now(),
            text: sysText,
            type: 'text',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }
        setMessages(prev => ({
            ...prev,
            [groupId]: [...(prev[groupId] || []), sysMsg]
        }))

        toast({
            title: "Settings Updated",
            description: `${desc} is now ${isNowEnabled ? 'restricted to admins' : 'open to all'}.`
        })
    }

    const handleAddMemberToGroup = (friendIds: number[]) => {
        if (!selectedFriendId || friendIds.length === 0) return

        setFriendsList(prev => prev.map(f => {
            if (f.id === selectedFriendId) {
                const newMemberIds = Array.from(new Set([...(f.memberIds || []), ...friendIds]))
                return {
                    ...f,
                    memberIds: newMemberIds,
                    bio: `${newMemberIds.length} members`
                }
            }
            return f
        }))

        const addedMessages = friendIds.map((id, index) => {
            const friend = friendsList.find(f => f.id === id)
            return {
                id: Date.now() + index + 1000,
                text: `You added ${friend?.name || 'a friend'}`,
                type: 'text',
                sender: 'me',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSystem: true
            }
        })

        setMessages(prev => ({
            ...prev,
            [selectedFriendId]: [...(prev[selectedFriendId] || []), ...addedMessages]
        }))

        setIsAddingMemberModalOpen(false)
        setSelectedGroupMembers([]) // Reuse this state or separate? Let's use it for selection.
        toast({ title: "Success", description: `${friendIds.length} member(s) added to the group.` })
    }

    const toggleAddFriendMode = () => {
        setIsAddingFriend(!isAddingFriend)
        if (!isAddingFriend) {
            setAddEmail("")
            setGlobalSearchResult(null)
        }
    }

    // Helper to get view icon
    const getViewIcon = () => {
        switch (activeView) {
            case 'archived': return <Archive className="w-5 h-5 text-accent" />;
            case 'favorites': return <Star className="w-5 h-5 text-accent" />;
            case 'settings': return <Settings className="w-5 h-5 text-accent" />;
            case 'call_log': return <Phone className="w-5 h-5 text-accent" />;
            case 'friend_requests': return <UserCheck className="w-5 h-5 text-accent" />;
            case 'broadcast_lists': return <Send className="w-5 h-5 text-accent" />;
            case 'group_invites': return <Mail className="w-5 h-5 text-accent" />;
            default: return <Users className="w-5 h-5 text-accent" />;
        }
    }

    const getViewTitle = () => {
        switch (activeView) {
            case 'archived': return 'Archived Chats';
            case 'favorites': return 'Favorites';
            case 'settings': return 'Settings';
            case 'call_log': return 'Calls';
            case 'friend_requests': return 'Friend Requests';
            case 'broadcast_lists': return 'Broadcast Lists';
            case 'group_invites': return 'Group Invites';
            default: return 'Friends';
        }
    }

    return (
        <AuthGuard>
            <div className={cn(
                "h-[calc(100dvh-3.5rem)] lg:h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-500",
                isDarkMode ? "text-white" : "text-black bg-[#f0f2f5]"
            )} style={{
                background: isDarkMode
                    ? `radial-gradient(ellipse at top left, rgba(var(--brand-rgb), 0.12) 0%, transparent 50%),
                       radial-gradient(ellipse at top right, rgba(var(--sand-rgb), 0.12) 0%, transparent 50%),
                       radial-gradient(ellipse at bottom, rgba(var(--brand-rgb), 0.12) 0%, transparent 50%),
                       var(--canvas)`
                    : `radial-gradient(ellipse at top left, rgba(var(--brand-rgb), 0.05) 0%, transparent 50%),
                       radial-gradient(ellipse at top right, rgba(var(--sand-rgb), 0.05) 0%, transparent 50%),
                       #f0f2f5`
            }}>
                <main className="flex-grow min-h-0 w-full flex flex-col overflow-hidden relative z-10">
                    <div className="flex-grow min-h-0 flex flex-col md:flex-row h-full">

                        {/* Sidebar Container (Navigation + List) */}
                        <div className={cn(
                            "w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-row overflow-hidden transition-all duration-300",
                            isDarkMode ? "glass-card border-line" : "bg-white/90 border border-black/5 shadow-xl"
                        )}>

                            {/* Left Navigation Rail */}
                            <div className={cn(
                                "w-16 flex flex-col items-center py-6 gap-6 z-20 backdrop-blur-md",
                                isDarkMode ? "bg-white/5 border-r border-line" : "bg-neutral-100/50 border-r border-black/5"
                            )}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("rounded-xl transition-all", activeView === 'all' ? "bg-sky-500 text-white" : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200"))}
                                    onClick={() => setActiveView('all')}
                                    title="All Chats"
                                >
                                    <MessageCircle className="w-6 h-6" />
                                </Button>
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("rounded-xl transition-all", activeView === 'favorites' ? "bg-sky-500 text-white" : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200"))}
                                        onClick={() => setActiveView('favorites')}
                                        title="Favorites"
                                    >
                                        <Star className="w-6 h-6" />
                                    </Button>
                                    {hasFavoritesUnread && (
                                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-canvas rounded-full shadow-lg"></span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("rounded-xl transition-all", activeView === 'archived' ? "bg-sky-500 text-white" : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200"))}
                                        onClick={() => setActiveView('archived')}
                                        title="Archived"
                                    >
                                        <Archive className="w-6 h-6" />
                                    </Button>
                                    {hasArchivedUnread && (
                                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-canvas rounded-full shadow-lg"></span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("rounded-xl transition-all", activeView === 'call_log' ? "bg-sky-500 text-white" : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200"))}
                                        onClick={() => setActiveView('call_log')}
                                        title="Call Log"
                                    >
                                        <Phone className="w-6 h-6" />
                                    </Button>
                                    {callLogs.filter(c => c.type === 'missed').length > 0 && (
                                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-canvas rounded-full shadow-lg"></span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("rounded-xl transition-all", activeView === 'friend_requests' ? "bg-sky-500 text-white" : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200"))}
                                        onClick={() => setActiveView('friend_requests')}
                                        title="Friend Requests"
                                    >
                                        <UserCheck className="w-6 h-6" />
                                    </Button>
                                    {friendRequests.filter(r => r.type === 'incoming').length > 0 && (
                                        <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] bg-sky-500 text-[10px] font-bold text-white border-2 border-canvas rounded-full shadow-lg px-1 transform translate-x-1/4 -translate-y-1/4">
                                            {friendRequests.filter(r => r.type === 'incoming').length}
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("rounded-xl transition-all", activeView === 'broadcast_lists' ? "bg-sky-500 text-white" : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200"))}
                                        onClick={() => setActiveView('broadcast_lists')}
                                        title="Broadcast Lists"
                                    >
                                        <Send className="w-6 h-6" />
                                    </Button>
                                </div>
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("rounded-xl transition-all", activeView === 'group_invites' ? "bg-sky-500 text-white" : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200"))}
                                        onClick={() => setActiveView('group_invites')}
                                        title="Group Invites"
                                    >
                                        <Mail className="w-6 h-6" />
                                    </Button>
                                    {groupInvites.length > 0 && (
                                        <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] bg-sky-500 text-[10px] font-bold text-white border-2 border-canvas rounded-full shadow-lg px-1 transform translate-x-1/4 -translate-y-1/4">
                                            {groupInvites.length}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-grow" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "rounded-xl transition-all duration-300",
                                        activeView === 'settings'
                                            ? "bg-sky-500 text-white"
                                            : cn(isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200")
                                    )}
                                    onClick={() => setActiveView('settings')}
                                    title="Settings"
                                >
                                    <Settings className="w-6 h-6" />
                                </Button>
                            </div>

                            {/* Sidebar Header & List */}
                            <div className={cn("flex-grow flex flex-col min-h-0 min-w-0 transition-colors duration-500", isDarkMode ? "bg-canvas/50" : "bg-neutral-50")}>
                                <div className={cn("p-4 border-b transition-colors duration-500", isDarkMode ? "border-line bg-white/5" : "border-black/5 bg-white")}>
                                    {activeView === 'settings' ? (
                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className={cn("text-xl font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                    <Settings className="w-5 h-5 text-accent" />
                                                    Settings
                                                </h2>
                                            </div>
                                            <div className="relative">
                                                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                <Input
                                                    placeholder="Search settings"
                                                    className={cn(
                                                        "pl-10 border-none focus-visible:ring-accent h-10 rounded-xl transition-all",
                                                        isDarkMode
                                                            ? "bg-panel-2 text-white placeholder:text-white/20"
                                                            : "bg-neutral-100 text-neutral-900 placeholder:text-neutral-400"
                                                    )}
                                                    value={settingsSearchQuery}
                                                    onChange={(e) => setSettingsSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ) : activeView === 'profile' ? (
                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => setActiveView('settings')}
                                                >
                                                    <ArrowLeft className="w-6 h-6" />
                                                </Button>
                                                <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Profile</h2>
                                            </div>
                                        </div>
                                    ) : isMultiSelectMode ? (
                                        <div className="flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setIsMultiSelectMode(false)}
                                                    className={cn("rounded-full transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                >
                                                    <ArrowLeft className="w-5 h-5" />
                                                </Button>
                                                <span className={cn("font-bold transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{selectedChatIds.length} selected</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* Bulk Actions */}
                                                <Button
                                                    disabled={selectedChatIds.length === 0}
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => {
                                                        // Archive Selected
                                                        setFriendsList(prev => prev.map(f => selectedChatIds.includes(f.id) ? { ...f, isArchived: !f.isArchived } : f))
                                                        toast({ title: "Archived", description: `${selectedChatIds.length} chats archived.` })
                                                        setIsMultiSelectMode(false)
                                                        setSelectedChatIds([])
                                                    }}
                                                >
                                                    <Archive className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    disabled={selectedChatIds.length === 0}
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full transition-colors", isDarkMode ? "text-white/60 hover:text-white hover:bg-red-500/10 hover:text-red-400" : "text-neutral-500 hover:text-red-600 hover:bg-red-50")}
                                                    onClick={() => {
                                                        setBulkDeleteConfirm({ type: 'me' })
                                                        setShowBulkChatDeleteModal(true)
                                                    }}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : !isAddingFriend ? (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className={cn("text-xl font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                    {getViewIcon()}
                                                    {getViewTitle()}
                                                </h2>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        onClick={toggleAddFriendMode}
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("rounded-full glow-hover transition-all", isDarkMode ? "text-white/60 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200")}
                                                        title="Add Friend by Email"
                                                    >
                                                        <UserPlus className="w-5 h-5" />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn("rounded-full glow-hover transition-all", isDarkMode ? "text-white/60 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200")}
                                                            >
                                                                <MoreVertical className="w-5 h-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className={cn("backdrop-blur-xl border min-w-[180px] rounded-2xl shadow-2xl p-2 z-[100] transition-all", isDarkMode ? "bg-panel-2/90 border-line text-white" : "bg-white/95 border-black/10 text-neutral-800")} align="end">
                                                            <DropdownMenuItem
                                                                className={cn("cursor-pointer gap-2 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                onClick={() => {
                                                                    setIsCreatingGroup(true)
                                                                    setGroupStep(1)
                                                                }}
                                                            >
                                                                <Users className="w-4 h-4 text-sky-500" /> New group
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className={cn("cursor-pointer gap-2 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                onClick={() => setShowStarredMessagesModal(true)}
                                                            >
                                                                <Star className="w-4 h-4 text-yellow-500" /> Starred messages
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className={cn("cursor-pointer gap-2 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                onClick={() => {
                                                                    setIsMultiSelectMode(true)
                                                                    setSelectedChatIds([])
                                                                }}
                                                            >
                                                                <Check className="w-4 h-4 text-emerald-500" /> Select chats
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                <Input
                                                    placeholder="Search your friends..."
                                                    className={cn(
                                                        "pl-10 border-none focus-visible:ring-accent h-10 rounded-xl transition-all",
                                                        isDarkMode
                                                            ? "bg-panel-2 text-white placeholder:text-white/20"
                                                            : "bg-neutral-100 text-neutral-900 placeholder:text-neutral-400"
                                                    )}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>

                                            {/* Filter Chips */}
                                            {activeView === 'all' && (
                                                <div className="flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <button
                                                        onClick={() => setFilterType('all')}
                                                        className={cn(
                                                            "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                                                            filterType === 'all'
                                                                ? "bg-sky-500/20 text-sky-400 border-sky-500/20"
                                                                : cn(isDarkMode
                                                                    ? "bg-white/5 text-white/60 border-line hover:bg-white/10 hover:border-white/20"
                                                                    : "bg-neutral-100 text-neutral-500 border-black/5 hover:bg-neutral-200 hover:border-black/10")
                                                        )}
                                                    >
                                                        All
                                                    </button>
                                                    <button
                                                        onClick={() => setFilterType('unread')}
                                                        className={cn(
                                                            "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                                                            filterType === 'unread'
                                                                ? "bg-sky-500/20 text-sky-400 border-sky-500/20"
                                                                : cn(isDarkMode
                                                                    ? "bg-white/5 text-white/60 border-line hover:bg-white/10 hover:border-white/20"
                                                                    : "bg-neutral-100 text-neutral-500 border-black/5 hover:bg-neutral-200 hover:border-black/10")
                                                        )}
                                                    >
                                                        Unread
                                                    </button>
                                                    <button
                                                        onClick={() => setFilterType('groups')}
                                                        className={cn(
                                                            "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                                                            filterType === 'groups'
                                                                ? "bg-sky-500/20 text-sky-400 border-sky-500/20"
                                                                : cn(isDarkMode
                                                                    ? "bg-white/5 text-white/60 border-line hover:bg-white/10 hover:border-white/20"
                                                                    : "bg-neutral-100 text-neutral-500 border-black/5 hover:bg-neutral-200 hover:border-black/10")
                                                        )}
                                                    >
                                                        Groups
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="animate-in slide-in-from-left-4 duration-300">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-8 w-8 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={toggleAddFriendMode}
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                </Button>
                                                <h2 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Add New Friend</h2>
                                            </div>
                                            <form onSubmit={handleGlobalSearch} className="space-y-3">
                                                <div className="relative">
                                                    <Input
                                                        type="email"
                                                        placeholder="Friend's email address"
                                                        className={cn(
                                                            "focus-visible:ring-accent h-11 rounded-xl transition-all",
                                                            isDarkMode
                                                                ? "bg-panel-2 border-line text-white placeholder:text-white/20"
                                                                : "bg-neutral-100 border-black/5 text-neutral-900 placeholder:text-neutral-400"
                                                        )}
                                                        value={addEmail}
                                                        onChange={(e) => setAddEmail(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <Button
                                                    type="submit"
                                                    className="w-full bg-accent hover:bg-accent/80 text-white h-11 rounded-xl font-bold gap-2 glow transition-all"
                                                    disabled={isSearchingGlobal || !addEmail.trim()}
                                                >
                                                    {isSearchingGlobal ? "Searching..." : (
                                                        <>
                                                            <Search className="w-4 h-4" />
                                                            Find User
                                                        </>
                                                    )}
                                                </Button>
                                            </form>
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar Content Area */}
                                <div className="flex-grow flex flex-col min-h-0 overflow-hidden" style={{ overscrollBehavior: 'contain' }}>
                                    {activeView === 'settings' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                                            <div
                                                onClick={() => setActiveView('profile')}
                                                className="p-4 rounded-2xl bg-white/5 border border-line flex items-center gap-4 group cursor-pointer hover:bg-white/10 transition-all duration-300"
                                            >
                                                <div className="relative">
                                                    <Avatar className="w-14 h-14 border-2 border-accent/20">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.full_name || 'User'}`} />
                                                        <AvatarFallback className="bg-white/10 text-white">
                                                            {currentUser?.full_name?.[0] || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-canvas rounded-full"></div>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className={cn("font-bold truncate group-hover:text-accent transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                        {currentUser?.full_name || 'Muhammad Mudasir'}
                                                    </h3>
                                                    <p className={cn("text-xs truncate italic", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                        {currentUser?.bio || 'Neither happy nor sad but missing ...'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Settings List */}
                                            <div className="space-y-1">
                                                {[
                                                    { id: 'privacy', icon: Lock, label: 'Privacy', sub: 'Block contacts' },
                                                    { id: 'chats', icon: MessageSquare, label: 'Chats', sub: 'Theme, wallpapers' },
                                                    { id: 'video_voice', icon: Camera, label: 'Video & voice', sub: 'Output, input, camera' },
                                                    { id: 'notifications', icon: Bell, label: 'Notifications', sub: 'Message, group & call tones' },
                                                ].filter(item =>
                                                    item.label.toLowerCase().includes(settingsSearchQuery.toLowerCase()) ||
                                                    item.sub.toLowerCase().includes(settingsSearchQuery.toLowerCase())
                                                ).map(item => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => {
                                                            if (item.id === 'privacy') setActiveView('settings_privacy')
                                                            else if (item.id === 'chats') setActiveView('settings_chats')
                                                            else if (item.id === 'video_voice') {
                                                                setActiveView('settings_video_voice')
                                                                loadAvailableDevices()
                                                            }
                                                            else if (item.id === 'notifications') setActiveView('settings_notifications')
                                                            else toast({ title: "Coming Soon", description: "This setting is not implemented yet." })
                                                        }}
                                                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 active:scale-98 transition-all duration-200 group text-left"
                                                    >
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", isDarkMode ? "bg-white/5 text-white/60 group-hover:bg-accent/20 group-hover:text-accent" : "bg-neutral-200 text-neutral-600 group-hover:bg-accent group-hover:text-white")}>
                                                            <item.icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <p className={cn("text-sm font-semibold transition-colors", isDarkMode ? "text-white group-hover:text-accent" : "text-neutral-800 group-hover:text-accent")}>
                                                                {item.label}
                                                            </p>
                                                            <p className={cn("text-[11px] truncate", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                {item.sub}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : activeView === 'profile' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            {/* Avatar Management */}
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="relative group cursor-pointer">
                                                    <Avatar className={cn("w-48 h-48 border-4 shadow-2xl transition-all", isDarkMode ? "border-line shadow-blue-500/10" : "border-white shadow-neutral-200")}>
                                                        <AvatarImage src={currentUser?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.full_name || 'User'}`} className="object-cover" />
                                                        <AvatarFallback className={cn("text-4xl transition-colors", isDarkMode ? "bg-white/5 text-white" : "bg-neutral-100 text-neutral-400")}>
                                                            {currentUser?.full_name?.[0] || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div
                                                        className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
                                                    >
                                                        <Camera className="w-8 h-8 text-white mb-2" />
                                                        <span className="text-[10px] text-white font-bold uppercase tracking-wider text-center px-4">Change profile picture</span>
                                                    </div>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <div className="absolute inset-0 rounded-full"></div>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className={cn("backdrop-blur-xl border min-w-[180px] rounded-2xl shadow-2xl p-2 z-[100] transition-all", isDarkMode ? "bg-panel-2/90 border-line text-white" : "bg-white/95 border-black/10 text-neutral-800")} align="center">
                                                            <DropdownMenuItem
                                                                className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                onClick={() => setIsViewingPhoto(true)}
                                                            >
                                                                <Eye className={cn("w-4 h-4", isDarkMode ? "text-white/40" : "text-neutral-500")} /> View photo
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                onClick={() => {
                                                                    setCameraPurpose('profile_picture');
                                                                    setIsCameraOpen(true);
                                                                }}
                                                            >
                                                                <Camera className={cn("w-4 h-4", isDarkMode ? "text-white/40" : "text-neutral-500")} /> Take photo
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                onClick={() => imageInputRef.current?.click()}
                                                            >
                                                                <ImageIcon className={cn("w-4 h-4", isDarkMode ? "text-white/40" : "text-neutral-500")} /> Upload photo
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className={cn(isDarkMode ? "bg-white/5" : "bg-black/5")} />
                                                            <DropdownMenuItem
                                                                className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors text-red-500", isDarkMode ? "focus:bg-red-500/10" : "focus:bg-red-50")}
                                                                onClick={handleRemovePhoto}
                                                            >
                                                                <Trash2 className="w-4 h-4" /> Remove photo
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            {/* Photo Viewer Dialog */}
                                            <Dialog open={isViewingPhoto} onOpenChange={setIsViewingPhoto}>
                                                <DialogContent className="max-w-xl bg-black/90 border-none p-0 overflow-hidden outline-none">
                                                    <div className="relative aspect-square flex items-center justify-center">
                                                        <img
                                                            src={currentUser?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.full_name || 'User'}`}
                                                            alt="Profile Photo"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full"
                                                            onClick={() => setIsViewingPhoto(false)}
                                                        >
                                                            <X className="w-6 h-6" />
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {/* Hidden File Input for Avatar Upload */}
                                            <input
                                                type="file"
                                                ref={imageInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            handleAvatarUpdate(reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />

                                            {/* Profile Info Sections */}
                                            <div className="space-y-8">
                                                {/* Name Section */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-accent uppercase tracking-widest opacity-60">Name</label>
                                                    {isEditingName ? (
                                                        <div className="space-y-3 animate-in fade-in duration-300">
                                                            <Input
                                                                value={editedName}
                                                                onChange={(e) => setEditedName(e.target.value)}
                                                                className="bg-white/5 border-line text-white focus-visible:ring-accent"
                                                                autoFocus
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                                            />
                                                            <div className="flex items-center gap-2 justify-end">
                                                                <Button variant="ghost" size="sm" onClick={() => {
                                                                    setEditedName(currentUser?.full_name || "")
                                                                    setIsEditingName(false)
                                                                }} className="text-white/40 hover:text-white font-medium">Cancel</Button>
                                                                <Button size="sm" onClick={handleSaveName} className="bg-accent hover:bg-accent/80 text-white font-medium">Save</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between group">
                                                            <p className="text-lg font-bold text-white">{currentUser?.full_name || 'Muhammad Mudasir'}</p>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-white/40 hover:text-white rounded-full transition-all"
                                                                onClick={() => setIsEditingName(true)}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* About Section */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-accent uppercase tracking-widest opacity-60">About</label>
                                                    {isEditingBio ? (
                                                        <div className="space-y-3 animate-in fade-in duration-300">
                                                            <textarea
                                                                value={editedBio}
                                                                onChange={(e) => setEditedBio(e.target.value)}
                                                                className="w-full min-h-[100px] bg-white/5 border border-line rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-accent resize-none text-sm custom-scrollbar"
                                                                autoFocus
                                                            />
                                                            <div className="flex items-center gap-2 justify-end">
                                                                <Button variant="ghost" size="sm" onClick={() => {
                                                                    setEditedBio(currentUser?.bio || "")
                                                                    setIsEditingBio(false)
                                                                }} className="text-white/40 hover:text-white font-medium">Cancel</Button>
                                                                <Button size="sm" onClick={handleSaveBio} className="bg-accent hover:bg-accent/80 text-white font-medium">Save</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start justify-between group">
                                                            <p className="text-sm text-white/80 leading-relaxed italic">
                                                                {currentUser?.bio || 'Neither happy nor sad but missing something in life. 🥲🥲'}
                                                            </p>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-white/40 hover:text-white rounded-full transition-all flex-shrink-0"
                                                                onClick={() => setIsEditingBio(true)}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Email Section */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-accent uppercase tracking-widest opacity-60">Email</label>
                                                    <div className="flex items-center justify-between group">
                                                        <p className="text-sm font-medium text-white/90">
                                                            {currentUser?.email || 'm.mudasir@example.com'}
                                                        </p>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-white/40 hover:text-white rounded-full transition-all"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(currentUser?.email || 'm.mudasir@example.com');
                                                                toast({ title: "Copied", description: "Email address copied to clipboard" });
                                                            }}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : activeView === 'settings_privacy' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center gap-3 mb-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => setActiveView('settings')}
                                                >
                                                    <ArrowLeft className="w-6 h-6" />
                                                </Button>
                                                <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Privacy</h2>
                                            </div>

                                            {/* Who Can See My Personal Info */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Who can see my personal info</h3>

                                                {/* Last Seen & Online */}
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div className={cn("p-4 transition-colors", isDarkMode ? "" : "")}>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <Clock className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Last seen & online</p>
                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>Who can see when you're online</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <select
                                                            value={lastSeenPrivacy}
                                                            onChange={(e) => setLastSeenPrivacy(e.target.value as any)}
                                                            className={cn("w-full p-3 rounded-xl text-sm transition-all", isDarkMode ? "bg-white/5 text-white border border-line focus:border-accent" : "bg-neutral-50 text-neutral-800 border border-black/10 focus:border-accent")}
                                                            style={isDarkMode ? { colorScheme: 'dark' } : {}}
                                                        >
                                                            <option value="everyone" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Everyone</option>
                                                            <option value="contacts" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>My contacts</option>
                                                            <option value="nobody" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Nobody</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Profile Photo */}
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div className={cn("p-4 transition-colors", isDarkMode ? "" : "")}>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <ImageIcon className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Profile photo</p>
                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>Who can see your profile picture</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <select
                                                            value={profilePhotoPrivacy}
                                                            onChange={(e) => setProfilePhotoPrivacy(e.target.value as any)}
                                                            className={cn("w-full p-3 rounded-xl text-sm transition-all", isDarkMode ? "bg-white/5 text-white border border-line focus:border-accent" : "bg-neutral-50 text-neutral-800 border border-black/10 focus:border-accent")}
                                                            style={isDarkMode ? { colorScheme: 'dark' } : {}}
                                                        >
                                                            <option value="everyone" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Everyone</option>
                                                            <option value="contacts" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>My contacts</option>
                                                            <option value="nobody" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Nobody</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* About */}
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div className={cn("p-4 transition-colors", isDarkMode ? "" : "")}>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <Info className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>About</p>
                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>Who can see your about info</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <select
                                                            value={aboutPrivacy}
                                                            onChange={(e) => setAboutPrivacy(e.target.value as any)}
                                                            className={cn("w-full p-3 rounded-xl text-sm transition-all", isDarkMode ? "bg-white/5 text-white border border-line focus:border-accent" : "bg-neutral-50 text-neutral-800 border border-black/10 focus:border-accent")}
                                                            style={isDarkMode ? { colorScheme: 'dark' } : {}}
                                                        >
                                                            <option value="everyone" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Everyone</option>
                                                            <option value="contacts" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>My contacts</option>
                                                            <option value="nobody" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Nobody</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Groups */}
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div className={cn("p-4 transition-colors", isDarkMode ? "" : "")}>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <Users className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Groups</p>
                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>Who can add you to groups</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <select
                                                            value={groupsPrivacy}
                                                            onChange={(e) => setGroupsPrivacy(e.target.value as any)}
                                                            className={cn("w-full p-3 rounded-xl text-sm transition-all mb-2", isDarkMode ? "bg-white/5 text-white border border-line focus:border-accent" : "bg-neutral-50 text-neutral-800 border border-black/10 focus:border-accent")}
                                                            style={isDarkMode ? { colorScheme: 'dark' } : {}}
                                                        >
                                                            <option value="everyone" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Everyone</option>
                                                            <option value="contacts" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>My contacts</option>
                                                            <option value="nobody" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Nobody</option>
                                                        </select>
                                                        <p className={cn("text-[10px] px-1 italic leading-tight", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                            {groupsPrivacy === 'everyone'
                                                                ? "Anyone can add you to groups directly."
                                                                : groupsPrivacy === 'contacts'
                                                                    ? "Only your contacts can add you directly. Others will send a group invite instead."
                                                                    : "No one can add you to groups directly. You will always receive a group invite first."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Message Privacy */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Message privacy</h3>

                                                {/* Read Receipts */}
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div
                                                        className={cn("flex items-center justify-between p-4 transition-colors cursor-pointer group", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}
                                                        onClick={() => setReadReceipts(!readReceipts)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                <CheckCheck className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Read receipts</p>
                                                                <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>{readReceipts ? 'Enabled' : 'Disabled'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={cn("w-12 h-6 rounded-full relative transition-colors", isDarkMode ? "bg-white/10 group-hover:bg-white/20" : "bg-neutral-200 group-hover:bg-neutral-300")}>
                                                            <div className={cn(
                                                                "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
                                                                readReceipts ? "right-1 bg-accent" : (isDarkMode ? "left-1 bg-white/40" : "left-1 bg-white")
                                                            )} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Disappearing Messages */}
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div className={cn("p-4 transition-colors", isDarkMode ? "" : "")}>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <Timer className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Disappearing messages</p>
                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>Default timer for new chats</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <select
                                                            value={disappearingMessagesDefault}
                                                            onChange={(e) => setDisappearingMessagesDefault(e.target.value as any)}
                                                            className={cn("w-full p-3 rounded-xl text-sm transition-all", isDarkMode ? "bg-white/5 text-white border border-line focus:border-accent" : "bg-neutral-50 text-neutral-800 border border-black/10 focus:border-accent")}
                                                            style={isDarkMode ? { colorScheme: 'dark' } : {}}
                                                        >
                                                            <option value="off" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>Off</option>
                                                            <option value="24h" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>24 hours</option>
                                                            <option value="7d" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>7 days</option>
                                                            <option value="90d" style={isDarkMode ? { backgroundColor: 'var(--panel-3)', color: 'var(--text)' } : {}}>90 days</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Blocked Contacts */}
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => setActiveView('settings_blocked_contacts')}
                                                    className={cn("w-full flex items-center gap-4 p-4 rounded-xl active:scale-98 transition-all duration-200 group text-left border border-transparent", isDarkMode ? "hover:bg-white/5 hover:border-line" : "bg-white shadow-sm hover:shadow-md border-black/5")}
                                                >
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", isDarkMode ? "bg-white/5 text-white/60 group-hover:bg-red-500/10 group-hover:text-red-400" : "bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white")}>
                                                        <Ban className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className={cn("text-sm font-semibold transition-colors", isDarkMode ? "text-white group-hover:text-red-400" : "text-neutral-800 group-hover:text-red-600")}>
                                                            Blocked contacts
                                                        </p>
                                                        <p className={cn("text-[11px] truncate", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                            {friendsList.filter(f => f.isBlocked).length} contacts blocked
                                                        </p>
                                                    </div>
                                                    <ChevronRight className={cn("w-4 h-4", isDarkMode ? "text-white/20 group-hover:text-white/60" : "text-neutral-400 group-hover:text-neutral-600")} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : activeView === 'friend_requests' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center gap-3 mb-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => setActiveView('all')}
                                                >
                                                    <ArrowLeft className="w-6 h-6" />
                                                </Button>
                                                <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Friend Requests</h2>
                                            </div>

                                            {friendRequests.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20">
                                                    <UserCheck className={cn("w-16 h-16 mb-4", isDarkMode ? "text-white/20" : "text-neutral-300")} />
                                                    <p className={cn("text-sm", isDarkMode ? "text-white/40" : "text-neutral-500")}>No pending friend requests</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Incoming Requests */}
                                                    {friendRequests.filter(r => r.type === 'incoming').length > 0 && (
                                                        <div className="space-y-4">
                                                            <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Incoming ({friendRequests.filter(r => r.type === 'incoming').length})</h3>
                                                            {friendRequests.filter(r => r.type === 'incoming').map(request => (
                                                                <div key={request.id} className={cn("rounded-2xl border p-4 transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                                    <div className="flex items-start gap-4">
                                                                        <Avatar className="w-14 h-14 border-2 border-accent/20">
                                                                            <AvatarImage src={request.image} alt={request.name} />
                                                                            <AvatarFallback>{request.name[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex-grow min-w-0">
                                                                            <p className={cn("text-sm font-bold truncate", isDarkMode ? "text-white" : "text-neutral-800")}>{request.name}</p>
                                                                            <p className={cn("text-[11px] mb-2", isDarkMode ? "text-white/60" : "text-neutral-600")}>
                                                                                Wants to be your friend
                                                                            </p>
                                                                            <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                                {Math.floor((Date.now() - request.timestamp) / 3600000)}h ago
                                                                            </p>
                                                                            <div className="flex gap-2 mt-3">
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="bg-accent hover:bg-accent/90 text-white"
                                                                                    onClick={() => handleAcceptFriendRequest(request.id)}
                                                                                >
                                                                                    <Check className="w-4 h-4 mr-1" />
                                                                                    Accept
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className={cn(isDarkMode ? "border-line text-white/60 hover:bg-white/5" : "border-black/10 text-neutral-600 hover:bg-neutral-50")}
                                                                                    onClick={() => handleDeclineFriendRequest(request.id)}
                                                                                >
                                                                                    Decline
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Outgoing Requests */}
                                                    {friendRequests.filter(r => r.type === 'outgoing').length > 0 && (
                                                        <div className="space-y-4">
                                                            <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Sent ({friendRequests.filter(r => r.type === 'outgoing').length})</h3>
                                                            {friendRequests.filter(r => r.type === 'outgoing').map(request => (
                                                                <div key={request.id} className={cn("rounded-2xl border p-4 transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                                    <div className="flex items-center gap-4">
                                                                        <Avatar className="w-12 h-12 opacity-60">
                                                                            <AvatarImage src={request.image} alt={request.name} />
                                                                            <AvatarFallback>{request.name[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex-grow min-w-0">
                                                                            <p className={cn("text-sm font-semibold truncate", isDarkMode ? "text-white/60" : "text-neutral-600")}>{request.name}</p>
                                                                            <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                                Pending • {Math.floor((Date.now() - request.timestamp) / 86400000)}d ago
                                                                            </p>
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className={cn("text-red-500 hover:bg-red-500/10")}
                                                                            onClick={() => handleCancelFriendRequest(request.id)}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : activeView === 'broadcast_lists' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                        onClick={() => setActiveView('all')}
                                                    >
                                                        <ArrowLeft className="w-6 h-6" />
                                                    </Button>
                                                    <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Broadcast Lists</h2>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="bg-accent hover:bg-accent/90 text-white"
                                                    onClick={() => setIsCreatingBroadcastList(true)}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    New List
                                                </Button>
                                            </div>

                                            {broadcastLists.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20">
                                                    <Send className={cn("w-16 h-16 mb-4", isDarkMode ? "text-white/20" : "text-neutral-300")} />
                                                    <p className={cn("text-sm mb-4", isDarkMode ? "text-white/40" : "text-neutral-500")}>No broadcast lists yet</p>
                                                    <Button
                                                        className="bg-accent hover:bg-accent/90 text-white"
                                                        onClick={() => setIsCreatingBroadcastList(true)}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Create Your First List
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {broadcastLists.map(list => {
                                                        const recipientNames = friendsList.filter(f => list.recipients.includes(f.id)).map(f => f.name)
                                                        return (
                                                            <div key={list.id} className={cn("rounded-2xl border p-4 transition-all group", isDarkMode ? "bg-white/5 border-line hover:bg-white/10" : "bg-white border-black/5 shadow-sm hover:shadow-md")}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                        <Send className="w-6 h-6" />
                                                                    </div>
                                                                    <div className="flex-grow min-w-0">
                                                                        <p className={cn("text-sm font-semibold truncate", isDarkMode ? "text-white" : "text-neutral-800")}>{list.name}</p>
                                                                        <p className={cn("text-[11px] truncate", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                            {list.recipients.length} recipients • Last used {Math.floor((Date.now() - list.lastUsed) / 86400000)}d ago
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => handleDeleteBroadcastList(list.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* Create Broadcast List Dialog */}
                                            <Dialog open={isCreatingBroadcastList} onOpenChange={setIsCreatingBroadcastList}>
                                                <DialogContent className={cn("max-w-md", isDarkMode ? "bg-panel-3 border-line" : "bg-white")}>
                                                    <DialogHeader>
                                                        <DialogTitle className={isDarkMode ? "text-white" : "text-neutral-800"}>Create Broadcast List</DialogTitle>
                                                        <DialogDescription className={isDarkMode ? "text-white/60" : "text-neutral-600"}>
                                                            Send messages to multiple people at once
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className={cn("text-sm font-medium mb-2 block", isDarkMode ? "text-white" : "text-neutral-800")}>List Name</label>
                                                            <Input
                                                                value={newBroadcastName}
                                                                onChange={(e) => setNewBroadcastName(e.target.value)}
                                                                placeholder="e.g., Family, Work Team"
                                                                className={cn(isDarkMode ? "bg-white/5 border-line text-white" : "bg-white border-black/10")}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className={cn("text-sm font-medium mb-2 block", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                Select Recipients ({selectedBroadcastRecipients.length})
                                                            </label>
                                                            <div className={cn("max-h-60 overflow-y-auto custom-scrollbar rounded-xl border p-2 space-y-1", isDarkMode ? "bg-white/5 border-line" : "bg-neutral-50 border-black/10")}>
                                                                {friendsList.map(friend => (
                                                                    <div
                                                                        key={friend.id}
                                                                        onClick={() => {
                                                                            setSelectedBroadcastRecipients(prev =>
                                                                                prev.includes(friend.id)
                                                                                    ? prev.filter(id => id !== friend.id)
                                                                                    : [...prev, friend.id]
                                                                            )
                                                                        }}
                                                                        className={cn(
                                                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                                                                            selectedBroadcastRecipients.includes(friend.id)
                                                                                ? "bg-accent/10 border border-accent/20"
                                                                                : (isDarkMode ? "hover:bg-white/5" : "hover:bg-white")
                                                                        )}
                                                                    >
                                                                        <Avatar className="w-10 h-10">
                                                                            <AvatarImage src={friend.image} alt={friend.name} />
                                                                            <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <p className={cn("text-sm font-medium flex-grow", isDarkMode ? "text-white" : "text-neutral-800")}>{friend.name}</p>
                                                                        {selectedBroadcastRecipients.includes(friend.id) && (
                                                                            <Check className="w-5 h-5 text-accent" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setIsCreatingBroadcastList(false)} className={isDarkMode ? "border-line text-white/60" : ""}>
                                                            Cancel
                                                        </Button>
                                                        <Button onClick={handleCreateBroadcastList} className="bg-accent hover:bg-accent/90 text-white">
                                                            Create List
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    ) : activeView === 'group_invites' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                        onClick={() => setActiveView('all')}
                                                    >
                                                        <ArrowLeft className="w-6 h-6" />
                                                    </Button>
                                                    <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Group Invites</h2>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn("text-[10px] h-8 gap-1.5 border-dashed", isDarkMode ? "border-white/20 text-white/40 hover:text-white" : "border-black/20 text-neutral-500 hover:text-neutral-800")}
                                                    onClick={() => {
                                                        const isStranger = Math.random() > 0.5;
                                                        const shouldAddDirectly = (groupsPrivacy === 'everyone') || (groupsPrivacy === 'contacts' && !isStranger);

                                                        if (shouldAddDirectly) {
                                                            toast({
                                                                title: "Added to Group",
                                                                description: `You were added directly to a new group by ${isStranger ? 'a stranger' : 'a contact'} (Privacy: ${groupsPrivacy})`,
                                                            });
                                                        } else {
                                                            const newInvite = {
                                                                id: Date.now(),
                                                                groupName: "New Tech Community",
                                                                groupImage: "https://i.pravatar.cc/150?img=12",
                                                                inviter: isStranger ? "Stranger (not in contacts)" : "Your Contact",
                                                                timestamp: Date.now()
                                                            };
                                                            setGroupInvites(prev => [newInvite, ...prev]);
                                                            toast({
                                                                title: "New Group Invite",
                                                                description: `Someone tried to add you, but your privacy settings (${groupsPrivacy}) required an invite instead.`,
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    Simulate incoming
                                                </Button>
                                            </div>

                                            {groupInvites.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20">
                                                    <Mail className={cn("w-16 h-16 mb-4", isDarkMode ? "text-white/20" : "text-neutral-300")} />
                                                    <p className={cn("text-sm", isDarkMode ? "text-white/40" : "text-neutral-500")}>No pending group invites</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {groupInvites.map(invite => (
                                                        <div key={invite.id} className={cn("rounded-2xl border p-4 transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                            <div className="flex items-start gap-4">
                                                                <Avatar className="w-14 h-14 border-2 border-accent/20">
                                                                    <AvatarImage src={invite.groupImage} alt={invite.groupName} />
                                                                    <AvatarFallback>{invite.groupName[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-grow min-w-0">
                                                                    <p className={cn("text-sm font-bold truncate", isDarkMode ? "text-white" : "text-neutral-800")}>{invite.groupName}</p>
                                                                    <p className={cn("text-[11px] mb-2", isDarkMode ? "text-white/60" : "text-neutral-600")}>
                                                                        {invite.inviter} invited you • {invite.memberCount} members
                                                                    </p>
                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                        {Math.floor((Date.now() - invite.timestamp) / 3600000)}h ago
                                                                    </p>
                                                                    <div className="flex gap-2 mt-3">
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-accent hover:bg-accent/90 text-white"
                                                                            onClick={() => handleAcceptGroupInvite(invite.id)}
                                                                        >
                                                                            <Check className="w-4 h-4 mr-1" />
                                                                            Join Group
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className={cn(isDarkMode ? "border-line text-white/60 hover:bg-white/5" : "border-black/10 text-neutral-600 hover:bg-neutral-50")}
                                                                            onClick={() => handleDeclineGroupInvite(invite.id)}
                                                                        >
                                                                            Decline
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : activeView === 'call_log' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                        onClick={() => setActiveView('all')}
                                                    >
                                                        <ArrowLeft className="w-6 h-6" />
                                                    </Button>
                                                    <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Calls</h2>
                                                </div>
                                                <div className="flex p-1 rounded-xl bg-white/5 border border-line">
                                                    <button
                                                        onClick={() => setCallLogFilter('all')}
                                                        className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", callLogFilter === 'all' ? "bg-accent text-white" : "text-white/40 hover:text-white")}
                                                    >
                                                        All
                                                    </button>
                                                    <button
                                                        onClick={() => setCallLogFilter('missed')}
                                                        className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", callLogFilter === 'missed' ? "bg-red-500 text-white" : "text-white/40 hover:text-white")}
                                                    >
                                                        Missed
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {callLogs
                                                    .filter(call => callLogFilter === 'all' || call.type === 'missed')
                                                    .map(call => (
                                                        <div key={call.id} className={cn("rounded-2xl border p-4 transition-all group", isDarkMode ? "bg-white/5 border-line hover:bg-white/10" : "bg-white border-black/5 shadow-sm hover:shadow-md")}>
                                                            <div className="flex items-center gap-4">
                                                                <Avatar className="w-12 h-12">
                                                                    <AvatarImage src={call.image} alt={call.name} />
                                                                    <AvatarFallback>{call.name[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-grow min-w-0">
                                                                    <p className={cn("text-sm font-semibold truncate", call.type === 'missed' ? "text-red-500" : (isDarkMode ? "text-white" : "text-neutral-800"))}>
                                                                        {call.name}
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                        {call.type === 'incoming' && <ArrowDown className="w-3 h-3 text-emerald-500" />}
                                                                        {call.type === 'outgoing' && <ArrowUp className="w-3 h-3 text-sky-500" />}
                                                                        {call.type === 'missed' && <ArrowDown className="w-3 h-3 text-red-500" />}
                                                                        <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                            {new Date(call.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            {call.duration && ` • ${formatDuration(call.duration)}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className={cn("rounded-full transition-all text-accent", isDarkMode ? "hover:bg-white/10" : "hover:bg-accent/10")}
                                                                    onClick={() => {
                                                                        // Logic for callback omitted for now
                                                                        toast({ title: "Calling...", description: `Initiating ${call.isVideo ? 'video' : 'voice'} call to ${call.name}` })
                                                                    }}
                                                                >
                                                                    {call.isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ) : activeView === 'settings_chats' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center gap-3 mb-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => setActiveView('settings')}
                                                >
                                                    <ArrowLeft className="w-6 h-6" />
                                                </Button>
                                                <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Chats</h2>
                                            </div>

                                            {/* Display Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Display</h3>
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div
                                                        className={cn("flex items-center justify-between p-4 transition-colors cursor-pointer group", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}
                                                        onClick={toggleTheme}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Theme</p>
                                                                <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>{isDarkMode ? 'Dark' : 'Light'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={cn("w-12 h-6 rounded-full relative transition-colors", isDarkMode ? "bg-white/10 group-hover:bg-white/20" : "bg-neutral-200 group-hover:bg-neutral-300")}>
                                                            <div className={cn(
                                                                "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
                                                                isDarkMode ? "right-1 bg-accent" : "left-1 bg-white"
                                                            )} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Wallpaper Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Wallpaper</h3>

                                                {/* Chat Overlay / Patterns */}
                                                <div className={cn("rounded-2xl border overflow-hidden mb-4 transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div className="p-4 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <Sparkles className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Chat Overlay</p>
                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>Professional patterns</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Pattern Selector */}
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(['none', 'stars', 'mosaic', 'lattice', 'neural', 'custom', 'circuit', 'triangles', 'waves'] as const).map((p) => (
                                                                <button
                                                                    key={p}
                                                                    onClick={() => updateOverlayPattern(p)}
                                                                    className={cn(
                                                                        "px-2 py-2 rounded-xl text-[10px] font-bold capitalize transition-all border",
                                                                        chatOverlayPattern === p
                                                                            ? "bg-accent border-accent text-white shadow-lg"
                                                                            : isDarkMode
                                                                                ? "bg-white/5 border-line text-white/60 hover:bg-white/10"
                                                                                : "bg-neutral-50 border-black/5 text-neutral-600 hover:bg-white"
                                                                    )}
                                                                >
                                                                    {p}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between px-1 mb-2">
                                                    <h3 className="text-[11px] font-bold text-accent uppercase tracking-wider opacity-60">Colors & Images</h3>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn("h-7 text-[10px] font-bold", isDarkMode ? "text-white/40 hover:text-white" : "text-neutral-500 hover:text-accent")}
                                                        onClick={() => wallpaperInputRef.current?.click()}
                                                    >
                                                        <Upload className="w-3 h-3 mr-1.5" />
                                                        Upload from PC
                                                    </Button>
                                                </div>
                                                <input
                                                    type="file"
                                                    ref={wallpaperInputRef}
                                                    onChange={handleWallpaperUpload}
                                                    accept="image/*"
                                                    className="hidden"
                                                />

                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { name: 'Default', value: '' },
                                                        { name: 'Sage', value: '#2d3436' },
                                                        { name: 'Teal', value: '#006266' },
                                                        { name: 'Night', value: 'linear-gradient(to bottom, #0f172a, #000000)' },
                                                        { name: 'Ocean', value: 'linear-gradient(to bottom right, #2E3192, #1BFFFF)' },
                                                        { name: 'Royal', value: 'linear-gradient(to bottom right, #141E30, #243B55)' },
                                                        { name: 'Sunset', value: 'linear-gradient(to bottom right, #ff5f6d, #ffc371)' },
                                                        { name: 'Deep Sea', value: 'linear-gradient(to bottom right, #000046, #1cb5e0)' },
                                                        { name: 'Forest', value: 'linear-gradient(to bottom right, #134E5E, #71B280)' },
                                                        { name: 'Purple Ray', value: 'linear-gradient(to bottom right, #4b6cb7, #182848)' },
                                                        { name: 'Midnight', value: 'linear-gradient(to bottom right, #232526, #414345)' },
                                                        { name: 'Bora Bora', value: 'linear-gradient(to bottom right, #00d2ff, #3a7bd5)' },
                                                        { name: 'Flamingo', value: 'linear-gradient(to bottom right, #ff4e50, #f9d423)' },
                                                        { name: 'Verdant', value: 'linear-gradient(to bottom right, #11998e, #38ef7d)' },
                                                        { name: 'Mystic', value: 'linear-gradient(to bottom right, #7579ff, #b224ef)' },
                                                        { name: 'Cyber', value: 'linear-gradient(to bottom right, #000046, #1cb5e0)' },
                                                        { name: 'Cosmic', value: 'linear-gradient(to bottom right, #360033, #0b8793)' },
                                                        { name: 'Aura', value: 'linear-gradient(to bottom right, #5433ff, #20bdff, #a5ffd6)' },
                                                    ].map((wp) => (
                                                        <div
                                                            key={wp.name}
                                                            onClick={() => updateWallpaper(wp.value)}
                                                            className={cn(
                                                                "aspect-[4/5] rounded-xl cursor-pointer border-2 transition-all relative group overflow-hidden",
                                                                chatWallpaper === wp.value ? "border-accent" : "border-line hover:border-white/20"
                                                            )}
                                                            style={{
                                                                background: wp.value || (isDarkMode ? 'var(--canvas)' : '#f0f2f5'),
                                                                backgroundSize: 'cover',
                                                                backgroundPosition: 'center'
                                                            }}
                                                        >
                                                            {chatOverlayPattern !== 'none' && (
                                                                <div className={cn(
                                                                    "absolute inset-0 pointer-events-none transition-opacity duration-500",
                                                                    isDarkMode ? "opacity-40" : "opacity-20"
                                                                )} style={{
                                                                    backgroundImage: CHAT_OVERLAY_PATTERNS[chatOverlayPattern],
                                                                    backgroundSize: chatOverlayPattern === 'dots' ? '12px 12px' : '60px 60px'
                                                                }} />
                                                            )}
                                                            {!wp.value && (
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                                                    <MessageSquare className="w-6 h-6 text-white" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                                                <p className="text-[10px] text-white/90 font-medium truncate">{wp.name}</p>
                                                            </div>
                                                            {chatWallpaper === wp.value && (
                                                                <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                                                    <Check className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : activeView === 'settings_video_voice' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center gap-3 mb-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => setActiveView('settings')}
                                                >
                                                    <ArrowLeft className="w-6 h-6" />
                                                </Button>
                                                <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Video & voice</h2>
                                            </div>

                                            {isLoadingDevices ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <div className="text-center space-y-3">
                                                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                        <p className={cn("text-sm", isDarkMode ? "text-white/60" : "text-neutral-600")}>Loading devices...</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Camera Section */}
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Camera</h3>
                                                        <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                            {availableCameras.length === 0 ? (
                                                                <div className="p-4 text-center">
                                                                    <p className={cn("text-sm", isDarkMode ? "text-white/40" : "text-neutral-500")}>No cameras found</p>
                                                                </div>
                                                            ) : (
                                                                availableCameras.map((camera, index) => (
                                                                    <div
                                                                        key={camera.deviceId}
                                                                        onClick={() => selectCamera(camera.deviceId)}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-4 transition-colors cursor-pointer group",
                                                                            index !== 0 && (isDarkMode ? "border-t border-line" : "border-t border-black/5"),
                                                                            isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                                <Camera className="w-5 h-5" />
                                                                            </div>
                                                                            <div>
                                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                                    {camera.label || `Camera ${index + 1}`}
                                                                                </p>
                                                                                {camera.deviceId === 'default' && (
                                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>System default</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {selectedCameraId === camera.deviceId && (
                                                                            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                                <Check className="w-3 h-3 text-white" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Microphone Section */}
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Microphone</h3>
                                                        <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                            {availableMicrophones.length === 0 ? (
                                                                <div className="p-4 text-center">
                                                                    <p className={cn("text-sm", isDarkMode ? "text-white/40" : "text-neutral-500")}>No microphones found</p>
                                                                </div>
                                                            ) : (
                                                                availableMicrophones.map((mic, index) => (
                                                                    <div
                                                                        key={mic.deviceId}
                                                                        onClick={() => selectMicrophone(mic.deviceId)}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-4 transition-colors cursor-pointer group",
                                                                            index !== 0 && (isDarkMode ? "border-t border-line" : "border-t border-black/5"),
                                                                            isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                                <Mic className="w-5 h-5" />
                                                                            </div>
                                                                            <div>
                                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                                    {mic.label || `Microphone ${index + 1}`}
                                                                                </p>
                                                                                {mic.deviceId === 'default' && (
                                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>System default</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {selectedMicrophoneId === mic.deviceId && (
                                                                            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                                <Check className="w-3 h-3 text-white" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Speakers Section */}
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Speakers</h3>
                                                        <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                            {availableSpeakers.length === 0 ? (
                                                                <div className="p-4 text-center">
                                                                    <p className={cn("text-sm", isDarkMode ? "text-white/40" : "text-neutral-500")}>No speakers found</p>
                                                                </div>
                                                            ) : (
                                                                availableSpeakers.map((speaker, index) => (
                                                                    <div
                                                                        key={speaker.deviceId}
                                                                        onClick={() => selectSpeaker(speaker.deviceId)}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-4 transition-colors cursor-pointer group",
                                                                            index !== 0 && (isDarkMode ? "border-t border-line" : "border-t border-black/5"),
                                                                            isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                                <Volume2 className="w-5 h-5" />
                                                                            </div>
                                                                            <div>
                                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                                    {speaker.label || `Speaker ${index + 1}`}
                                                                                </p>
                                                                                {speaker.deviceId === 'default' && (
                                                                                    <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>System default</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {selectedSpeakerId === speaker.deviceId && (
                                                                            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                                <Check className="w-3 h-3 text-white" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : activeView === 'settings_notifications' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8 animate-in slide-in-from-right-4 duration-500" data-lenis-prevent>
                                            <div className="flex items-center gap-3 mb-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => setActiveView('settings')}
                                                >
                                                    <ArrowLeft className="w-6 h-6" />
                                                </Button>
                                                <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Notifications</h2>
                                            </div>

                                            {/* Hidden File Inputs */}
                                            <input type="file" id="msg-tone-upload" className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e, 'message')} />
                                            <input type="file" id="group-tone-upload" className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e, 'group')} />
                                            <input type="file" id="call-ringtone-upload" className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e, 'call')} />

                                            {/* Browser Notifications Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Browser Notifications</h3>
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div
                                                        className={cn("flex items-center justify-between p-4 transition-colors cursor-pointer group", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}
                                                        onClick={toggleBrowserNotifications}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                <Bell className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Desktop Notifications</p>
                                                                <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                    {browserNotificationsEnabled ? 'Enabled' : 'Disabled'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={cn("w-12 h-6 rounded-full relative transition-colors", isDarkMode ? "bg-white/10 group-hover:bg-white/20" : "bg-neutral-200 group-hover:bg-neutral-300")}>
                                                            <div className={cn(
                                                                "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
                                                                browserNotificationsEnabled ? "right-1 bg-accent" : (isDarkMode ? "left-1 bg-white/40" : "left-1 bg-white")
                                                            )} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notification Sounds Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60 px-1">Sounds</h3>
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    <div
                                                        className={cn("flex items-center justify-between p-4 transition-colors cursor-pointer group", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}
                                                        onClick={toggleNotificationSounds}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                <Volume2 className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>Notification Sounds</p>
                                                                <p className={cn("text-[11px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                    {notificationSoundsEnabled ? 'Enabled' : 'Disabled'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={cn("w-12 h-6 rounded-full relative transition-colors", isDarkMode ? "bg-white/10 group-hover:bg-white/20" : "bg-neutral-200 group-hover:bg-neutral-300")}>
                                                            <div className={cn(
                                                                "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
                                                                notificationSoundsEnabled ? "right-1 bg-accent" : (isDarkMode ? "left-1 bg-white/40" : "left-1 bg-white")
                                                            )} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Message Tone Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60">Message Tone</h3>
                                                </div>
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    {/* Add from PC as first item */}
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between p-4 transition-colors cursor-pointer group border-b",
                                                            isDarkMode ? "hover:bg-white/5 border-line" : "hover:bg-neutral-50 border-black/5"
                                                        )}
                                                        onClick={() => document.getElementById('msg-tone-upload')?.click()}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                <Plus className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-semibold transition-colors", isDarkMode ? "text-white group-hover:text-accent" : "text-neutral-800 group-hover:text-accent")}>Add from PC</p>
                                                                <p className={cn("text-[10px] uppercase tracking-wider opacity-60", isDarkMode ? "text-white/40" : "text-neutral-500")}>Upload custom audio</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    {/* Custom Tones */}
                                                    {customMessageTones.map((tone) => (
                                                        <div
                                                            key={tone.id}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 transition-colors cursor-pointer group border-b",
                                                                isDarkMode ? "hover:bg-white/5 border-line" : "hover:bg-neutral-50 border-black/5"
                                                            )}
                                                            onClick={() => selectMessageTone(tone.id)}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                                                                    <Music className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>{tone.name}</p>
                                                                    <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Custom</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isPlayingPreview === tone.id ? (
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-accent" onClick={(e) => { e.stopPropagation(); stopPreview(); }}>
                                                                        <VolumeX className="w-4 h-4" />
                                                                    </Button>
                                                                ) : selectedMessageTone === tone.id && (
                                                                    <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                        <Check className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-white/20 hover:text-red-500"
                                                                    onClick={(e) => { e.stopPropagation(); deleteCustomTone(tone.id, 'message'); }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Built-in Tones */}
                                                    {Object.entries(notificationTones.message).map(([key, tone], index) => (
                                                        <div
                                                            key={key}
                                                            onClick={() => selectMessageTone(key)}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 transition-colors cursor-pointer group",
                                                                (index !== 0 || customMessageTones.length > 0) && (isDarkMode ? "border-t border-line" : "border-t border-black/5"),
                                                                isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <MessageSquare className="w-5 h-5" />
                                                                </div>
                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                    {tone.name}
                                                                </p>
                                                            </div>
                                                            {isPlayingPreview === key ? (
                                                                <div className="text-accent animate-pulse">
                                                                    <Volume2 className="w-4 h-4" />
                                                                </div>
                                                            ) : selectedMessageTone === key && (
                                                                <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                    <Check className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Group Tone Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60">Group Tone</h3>
                                                </div>
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    {/* Add from PC as first item */}
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between p-4 transition-colors cursor-pointer group border-b",
                                                            isDarkMode ? "hover:bg-white/5 border-line" : "hover:bg-neutral-50 border-black/5"
                                                        )}
                                                        onClick={() => document.getElementById('group-tone-upload')?.click()}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                <Plus className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-semibold transition-colors", isDarkMode ? "text-white group-hover:text-accent" : "text-neutral-800 group-hover:text-accent")}>Add from PC</p>
                                                                <p className={cn("text-[10px] uppercase tracking-wider opacity-60", isDarkMode ? "text-white/40" : "text-neutral-500")}>Upload custom audio</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    {/* Custom Tones */}
                                                    {customGroupTones.map((tone) => (
                                                        <div
                                                            key={tone.id}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 transition-colors cursor-pointer group border-b",
                                                                isDarkMode ? "hover:bg-white/5 border-line" : "hover:bg-neutral-50 border-black/5"
                                                            )}
                                                            onClick={() => selectGroupTone(tone.id)}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                                                                    <Music className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>{tone.name}</p>
                                                                    <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Custom</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isPlayingPreview === tone.id ? (
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-accent" onClick={(e) => { e.stopPropagation(); stopPreview(); }}>
                                                                        <VolumeX className="w-4 h-4" />
                                                                    </Button>
                                                                ) : selectedGroupTone === tone.id && (
                                                                    <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                        <Check className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-white/20 hover:text-red-500"
                                                                    onClick={(e) => { e.stopPropagation(); deleteCustomTone(tone.id, 'group'); }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Built-in Tones */}
                                                    {Object.entries(notificationTones.group).map(([key, tone], index) => (
                                                        <div
                                                            key={key}
                                                            onClick={() => selectGroupTone(key)}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 transition-colors cursor-pointer group",
                                                                (index !== 0 || customGroupTones.length > 0) && (isDarkMode ? "border-t border-line" : "border-t border-black/5"),
                                                                isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                    <Users className="w-5 h-5" />
                                                                </div>
                                                                <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                    {tone.name}
                                                                </p>
                                                            </div>
                                                            {isPlayingPreview === key ? (
                                                                <div className="text-accent animate-pulse">
                                                                    <Volume2 className="w-4 h-4" />
                                                                </div>
                                                            ) : selectedGroupTone === key && (
                                                                <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                    <Check className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Call Ringtone Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="text-xs font-bold text-accent uppercase tracking-widest opacity-60">Call Ringtone</h3>
                                                </div>
                                                <div className={cn("rounded-2xl border overflow-hidden transition-all", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                    {/* Add from PC as first item */}
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between p-4 transition-colors cursor-pointer group border-b",
                                                            isDarkMode ? "hover:bg-white/5 border-line" : "hover:bg-neutral-50 border-black/5"
                                                        )}
                                                        onClick={() => document.getElementById('call-ringtone-upload')?.click()}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                                <Plus className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-semibold transition-colors", isDarkMode ? "text-white group-hover:text-accent" : "text-neutral-800 group-hover:text-accent")}>Add from PC</p>
                                                                <p className={cn("text-[10px] uppercase tracking-wider opacity-60", isDarkMode ? "text-white/40" : "text-neutral-500")}>Upload custom audio</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    {/* Custom Tones */}
                                                    {customCallTones.map((tone) => (
                                                        <div
                                                            key={tone.id}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 transition-colors cursor-pointer group border-b",
                                                                isDarkMode ? "hover:bg-white/5 border-line" : "hover:bg-neutral-50 border-black/5"
                                                            )}
                                                            onClick={() => selectCallRingtone(tone.id)}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                                                                    <Music className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>{tone.name}</p>
                                                                    <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Custom Pro</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isPlayingPreview === tone.id ? (
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-accent animate-pulse" onClick={(e) => { e.stopPropagation(); stopPreview(); }}>
                                                                        <VolumeX className="w-4 h-4" />
                                                                    </Button>
                                                                ) : selectedCallRingtone === tone.id && (
                                                                    <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                        <Check className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-white/20 hover:text-red-500"
                                                                    onClick={(e) => { e.stopPropagation(); deleteCustomTone(tone.id, 'call'); }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Built-in Tones */}
                                                    {Object.entries(notificationTones.call).map(([key, tone], index) => (
                                                        <div
                                                            key={key}
                                                            onClick={() => selectCallRingtone(key)}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 transition-colors cursor-pointer group",
                                                                (index !== 0 || customCallTones.length > 0) && (isDarkMode ? "border-t border-line" : "border-t border-black/5"),
                                                                isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", key.startsWith('pro_') ? "bg-amber-500/10 text-amber-500" : "bg-accent/10 text-accent")}>
                                                                    <Phone className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                        {tone.name}
                                                                    </p>
                                                                    {key.startsWith('pro_') && <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">Professional</p>}
                                                                </div>
                                                            </div>
                                                            {isPlayingPreview === key ? (
                                                                <div className="text-accent animate-pulse">
                                                                    <Volume2 className="w-4 h-4" />
                                                                </div>
                                                            ) : selectedCallRingtone === key && (
                                                                <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                                                    <Check className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : activeView === 'settings_blocked_contacts' ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6 animate-in slide-in-from-right-4 duration-500">
                                            <div className="flex items-center gap-3 mb-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100")}
                                                    onClick={() => setActiveView('settings_privacy')}
                                                >
                                                    <ArrowLeft className="w-6 h-6" />
                                                </Button>
                                                <h2 className={cn("text-xl font-bold transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>Blocked contacts</h2>
                                            </div>

                                            {/* Add Blocked Contact Button */}
                                            <div
                                                onClick={() => {
                                                    setIsAddingBlockedContact(true)
                                                }}
                                                className={cn("flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all mb-2", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-100")}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                    <UserPlus className="w-5 h-5" />
                                                </div>
                                                <p className={cn("font-bold text-sm transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>Add blocked contact</p>
                                            </div>

                                            <div className="space-y-2">
                                                {friendsList.filter(f => f.isBlocked).length === 0 ? (
                                                    <div className={cn("text-center py-10 text-sm transition-colors", isDarkMode ? "text-white/40" : "text-neutral-400")}>
                                                        No blocked contacts
                                                    </div>
                                                ) : (
                                                    friendsList.filter(f => f.isBlocked).map(friend => (
                                                        <div key={friend.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors", isDarkMode ? "bg-white/5 border-line" : "bg-white border-black/5 shadow-sm")}>
                                                            <Avatar className="w-10 h-10">
                                                                <AvatarImage src={friend.image} />
                                                                <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-grow min-w-0">
                                                                <p className={cn("font-bold text-sm truncate transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{friend.name}</p>
                                                                <p className={cn("text-xs truncate transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{friend.bio || friend.email}</p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn("rounded-full transition-colors", isDarkMode ? "text-white/40 hover:text-red-400 hover:bg-red-500/10" : "text-neutral-400 hover:text-red-600 hover:bg-red-50")}
                                                                onClick={() => {
                                                                    setFriendsList(prev => prev.map(f => f.id === friend.id ? { ...f, isBlocked: false } : f))
                                                                    toast({ title: "Unblocked", description: `${friend.name} has been unblocked.` })
                                                                }}
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ) : !isAddingFriend ? (
                                        // Friends List
                                        <div className="flex-grow overflow-y-auto custom-scrollbar" data-lenis-prevent>
                                            {filteredFriends.length > 0 ? (
                                                filteredFriends.map(friend => (
                                                    <ContextMenu key={friend.id}>
                                                        <ContextMenuTrigger>
                                                            <div
                                                                onClick={() => selectFriend(friend.id)}
                                                                className={cn(
                                                                    "group relative p-4 flex items-center gap-4 cursor-pointer transition-all border-l-4",
                                                                    selectedFriendId === friend.id && !globalSearchResult && !isMultiSelectMode
                                                                        ? "bg-gradient-to-r from-sky-500/10 to-transparent border-sky-400 shadow-[inset_4px_0_12px_rgba(var(--brand-rgb),0.1)]"
                                                                        : cn("border-transparent", isDarkMode ? "hover:bg-white/5 hover:border-line" : "hover:bg-neutral-100 hover:border-black/5"),
                                                                    friend.isPinned && activeView === 'all' && !isMultiSelectMode ? (isDarkMode ? "bg-white/5" : "bg-neutral-100/50") : "",
                                                                    isMultiSelectMode && selectedChatIds.includes(friend.id) ? (isDarkMode ? "bg-white/10" : "bg-sky-50") : ""
                                                                )}
                                                            >
                                                                {isMultiSelectMode && (
                                                                    <div className="flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-200">
                                                                        <Checkbox
                                                                            checked={selectedChatIds.includes(friend.id)}
                                                                            onCheckedChange={() => toggleChatSelection(friend.id)}
                                                                            className={cn("transition-colors", isDarkMode ? "border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-black" : "border-black/20 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white")}
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="relative flex-shrink-0">
                                                                    <Avatar className="w-12 h-12 border border-line">
                                                                        {friend.hasBlockedMe ? (
                                                                            <AvatarFallback className="bg-white/5 text-white/20">
                                                                                <Users className="w-6 h-6" /> {/* Hidden because they blocked me */}
                                                                            </AvatarFallback>
                                                                        ) : (
                                                                            <>
                                                                                <AvatarImage src={friend.image} />
                                                                                <AvatarFallback>
                                                                                    {friend.isGroup ? <Users className="w-6 h-6 text-white/40" /> : friend.name[0]}
                                                                                </AvatarFallback>
                                                                            </>
                                                                        )}
                                                                    </Avatar>
                                                                    {friend.status === "online" && !friend.isBlocked && (
                                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-canvas rounded-full shadow-lg" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-grow min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className={cn("font-bold truncate flex items-center gap-1.5", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                            {friend.name}
                                                                            {friend.isBlocked && (
                                                                                <Ban className="w-3.5 h-3.5 text-red-500" />
                                                                            )}
                                                                            {friend.isExited && (
                                                                                <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">Exited</span>
                                                                            )}
                                                                            {friend.isFavourite && <Heart className="w-3 h-3 text-accent fill-accent" />}
                                                                            {friend.isPinned && <Pin className={cn("w-3 h-3 rotate-45", isDarkMode ? "text-white/40" : "text-neutral-400")} />}
                                                                        </h3>
                                                                        <span className={cn(
                                                                            "text-[10px] whitespace-nowrap",
                                                                            ((friend.unreadCount || 0) > 0 || friend.isUnread) ? "text-accent font-bold" : (isDarkMode ? "text-white/20" : "text-neutral-400")
                                                                        )}>
                                                                            {friend.lastSeen}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center mt-0.5">
                                                                        <div className={cn("text-xs truncate flex-grow flex items-center gap-1", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                            {friend.isMuted && <BellOff className="w-3 h-3 inline opacity-50 flex-shrink-0" />}
                                                                            <span className="truncate italic">
                                                                                {(() => {
                                                                                    const chatMsgs = messages[friend.id] || [];
                                                                                    if (chatMsgs.length === 0) return friend.bio;
                                                                                    const last = chatMsgs[chatMsgs.length - 1];

                                                                                    if (last.type === 'image') return <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Photo</span>;
                                                                                    if (last.type === 'video') return <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Video</span>;
                                                                                    if (last.type === 'voice') return <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice message</span>;
                                                                                    if (last.type === 'file') return <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> Document</span>;
                                                                                    return last.text;
                                                                                })()}
                                                                            </span>
                                                                        </div>
                                                                        {((friend.unreadCount || 0) > 0 || friend.isUnread) && (
                                                                            <span className="bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 min-w-[18px] h-[18px] flex items-center justify-center">
                                                                                {friend.unreadCount || ""}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent className={cn("backdrop-blur-xl border min-w-[200px] rounded-2xl shadow-2xl p-2 z-[100] transition-all", isDarkMode ? "bg-panel-2/90 border-line text-white" : "bg-white/95 border-black/10 text-neutral-800")} align="start">
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => setShowGroupInfo(true)}>
                                                                <Info className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> {friend.isGroup ? "Group info" : "Contact info"}
                                                            </ContextMenuItem>
                                                            <ContextMenuSeparator className={cn(isDarkMode ? "bg-white/5" : "bg-black/5")} />
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => archiveFriend(friend.id)}>
                                                                <Archive className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> {friend.isArchived ? "Unarchive chat" : "Archive chat"}
                                                            </ContextMenuItem>
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => toggleMuteFriend(friend.id)}>
                                                                <BellOff className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> {friend.isMuted ? "Unmute notifications" : "Mute notifications"}
                                                            </ContextMenuItem>
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => togglePinFriend(friend.id)}>
                                                                <Pin className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> {friend.isPinned ? "Unpin chat" : "Pin chat"}
                                                            </ContextMenuItem>
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => toggleReadStatus(friend.id)}>
                                                                <MessageSquare className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> {((friend.unreadCount || 0) > 0 || friend.isUnread) ? "Mark as read" : "Mark as unread"}
                                                            </ContextMenuItem>
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => toggleFavouriteFriend(friend.id)}>
                                                                <Heart className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500", friend.isFavourite && (isDarkMode ? "fill-accent text-accent" : "fill-sky-500 text-sky-500"))} /> {friend.isFavourite ? "Remove from favourites" : "Add to favourites"}
                                                            </ContextMenuItem>
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => setSelectedFriendId(null)}>
                                                                <X className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> Close chat
                                                            </ContextMenuItem>
                                                            <ContextMenuSeparator className={cn(isDarkMode ? "bg-white/5" : "bg-black/5")} />
                                                            {friend.isGroup && !friend.isExited && (
                                                                <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 transition-colors text-red-500", isDarkMode ? "focus:bg-red-500/10" : "focus:bg-red-50 focus:text-red-900")} onClick={() => setGroupToExit(friend.id)}>
                                                                    <LogOut className="w-4 h-4" /> Exit group
                                                                </ContextMenuItem>
                                                            )}
                                                            {friend.isGroup && friend.isExited && (
                                                                <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 transition-colors text-red-500", isDarkMode ? "focus:bg-red-500/10" : "focus:bg-red-50 focus:text-red-900")} onClick={() => confirmDeleteChat(friend)}>
                                                                    <Trash2 className="w-4 h-4" /> Delete group
                                                                </ContextMenuItem>
                                                            )}
                                                            {!friend.isGroup && (
                                                                <>
                                                                    {friend.isBlocked ? (
                                                                        <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 rounded-xl transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => {
                                                                            setFriendsList(prev => prev.map(f => f.id === friend.id ? { ...f, isBlocked: false } : f))
                                                                            toast({ title: "Unblocked", description: `${friend.name} has been unblocked.` })
                                                                        }}>
                                                                            <Ban className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> Unblock {friend.name}
                                                                        </ContextMenuItem>
                                                                    ) : (
                                                                        <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")} onClick={() => confirmBlockUser(friend)}>
                                                                            <Ban className={cn("w-4 h-4", isDarkMode ? "text-white/60" : "text-neutral-500")} /> Block {friend.name}
                                                                        </ContextMenuItem>
                                                                    )}
                                                                    <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 transition-colors text-red-500", isDarkMode ? "focus:bg-red-500/10" : "focus:bg-red-50 focus:text-red-900")} onClick={() => handleReportFriend(friend)}>
                                                                        <AlertCircle className="w-4 h-4" /> Report {friend.name}
                                                                    </ContextMenuItem>
                                                                </>
                                                            )}
                                                            <ContextMenuItem className={cn("cursor-pointer gap-3 py-2.5 transition-colors text-red-500", isDarkMode ? "focus:bg-red-500/10" : "focus:bg-red-50 focus:text-red-900")} onClick={() => confirmDeleteChat(friend)}>
                                                                <Trash2 className="w-4 h-4" /> Delete chat
                                                            </ContextMenuItem>
                                                        </ContextMenuContent>
                                                    </ContextMenu>
                                                ))
                                            ) : (
                                                <div className="p-12 text-center animate-in fade-in duration-500">
                                                    {searchQuery ? (
                                                        <div className="space-y-4">
                                                            <p className="text-white/40 text-sm">No matches found for "{searchQuery}"</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                {getViewIcon()}
                                                            </div>
                                                            <p className="text-white/40 text-sm">
                                                                {activeView === 'archived' ? 'No archived chats' :
                                                                    activeView === 'favorites' ? 'No favorites yet' :
                                                                        'Your friends list is empty'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                    ) : (
                                        // Add Friend Mode Information / Recent Searches (Placeholder)
                                        <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <ShieldCheck className="w-6 h-6 text-accent" />
                                            </div>
                                            <h3 className="text-white font-bold mb-2">Add by email</h3>
                                            <p className="text-xs text-white/40 leading-relaxed">
                                                Enter a friend's exact email address to find and add them.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {/* End Sidebar Content Area */}
                            </div>
                            {/* End Sidebar Container */}
                        </div>

                        {/* Main Content Area */}
                        <div className={cn(
                            "flex-grow min-w-0 overflow-hidden flex flex-row h-full shadow-2xl transition-all duration-500",
                            isDarkMode ? "glass border-line md:rounded-2xl" : "bg-white border border-black/5 md:rounded-2xl shadow-xl"
                        )}>
                            {selectedFriend && globalSearchResult !== "not_found" ? (
                                <>
                                    <div className={cn("flex-grow flex-col min-h-0 min-w-0 h-full", (isCameraOpen || !!mediaPreview) ? "hidden" : "flex")}>
                                        {/* Detail Header / Selection Bar */}
                                        <div className={cn(
                                            "flex-shrink-0 p-4 sm:p-6 border-b flex items-center justify-between transition-colors duration-500",
                                            isDarkMode ? "border-line bg-white/5" : "border-black/5 bg-neutral-50"
                                        )}>
                                            {isSelectMode ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-4">
                                                        <Button variant="ghost" size="icon" onClick={exitSelectMode} className={cn("rounded-full", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>
                                                            <X className="w-5 h-5" />
                                                        </Button>
                                                        <span className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>{selectedMessageIds.length} Selected</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon" onClick={handleBulkCopy} className={cn("rounded-full", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={handleBulkForward} className={cn("rounded-full", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>
                                                            <Forward className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setShowBulkMessageDeleteModal(true)}
                                                            className={cn("rounded-full transition-colors", isDarkMode ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-500 hover:text-red-600 hover:bg-red-50")}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div
                                                        className={cn("flex items-center gap-4 flex-grow cursor-pointer hover:bg-white/5 transition-colors rounded-xl px-2 -ml-2")}
                                                        onClick={() => setShowGroupInfo(true)}
                                                    >
                                                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-primary/20">
                                                            {selectedFriend.hasBlockedMe ? (
                                                                <AvatarFallback className="bg-white/5 text-white/20">
                                                                    <Users className="w-6 h-6" />
                                                                </AvatarFallback>
                                                            ) : (
                                                                <>
                                                                    <AvatarImage src={selectedFriend.image} />
                                                                    <AvatarFallback>{selectedFriend.name[0]}</AvatarFallback>
                                                                </>
                                                            )}
                                                        </Avatar>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h2 className={cn("text-lg font-bold leading-tight", isDarkMode ? "text-white" : "text-neutral-800")}>{selectedFriend.name}</h2>
                                                                {selectedFriend.isBlocked && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Blocked</span>}
                                                            </div>
                                                            {!selectedFriend.isBlocked && (
                                                                <div className="flex items-center gap-1.5">
                                                                    {!selectedFriend.isGroup && <div className={cn("w-1.5 h-1.5 rounded-full", selectedFriend.status === "online" ? "bg-emerald-500" : (isDarkMode ? "bg-white/20" : "bg-neutral-300"))} />}
                                                                    <span className={cn(
                                                                        "text-[10px] capitalize transition-all duration-300",
                                                                        isTyping ? "text-sky-400 font-bold animate-pulse" : (isDarkMode ? "text-white/40" : "text-neutral-500")
                                                                    )}>
                                                                        {isTyping ? "Typing..." : (selectedFriend.isGroup ? `You, ${selectedFriend.bio}` : (selectedFriend.status === "online" ? "Active now" : `Last seen ${selectedFriend.lastSeen}`))}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {selectedFriend.isFriend && !selectedFriend.isBlocked && (
                                                            <>
                                                                <Button
                                                                    onClick={() => startCall('video')}
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className={cn("rounded-full hidden sm:flex transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100")}
                                                                >
                                                                    <Video className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    onClick={() => startCall('audio')}
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className={cn("rounded-full hidden sm:flex transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100")}
                                                                >
                                                                    <Phone className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button variant="ghost" size="icon" className={cn("rounded-full transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100")} onClick={() => setIsStarredViewOpen(true)}>
                                                            <Star className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className={cn("rounded-full transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100")}>
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Pinned Messages Bar */}
                                        {selectedFriend && messages[selectedFriend.id]?.some(m => m.isPinned) && (
                                            <div className={cn("flex-shrink-0 backdrop-blur-md border-b p-2 flex items-center gap-3 animate-in slide-in-from-top duration-300 transition-colors", isDarkMode ? "bg-panel-2/80 border-line" : "bg-white/90 border-black/5")}>
                                                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                                                    <Pin className="w-5 h-5 fill-accent" />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <p className="text-xs text-accent font-bold">Pinned Message</p>
                                                    <p className={cn("text-[11px] truncate", isDarkMode ? "text-white/60" : "text-neutral-600")}>
                                                        {messages[selectedFriend.id].find(m => m.isPinned)?.text}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn("text-[10px] transition-colors", isDarkMode ? "text-white/40 hover:text-white" : "text-neutral-500 hover:text-neutral-800")}
                                                    onClick={() => {
                                                        const pinned = messages[selectedFriend.id].find(m => m.isPinned)
                                                        if (pinned) scrollToMessage(pinned.id)
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        )}

                                        {/* Main Content Row */}
                                        <div className="flex-grow flex overflow-hidden">
                                            {/* Chat Column */}
                                            <div
                                                className="flex-grow flex flex-col min-h-0 min-w-0 relative"
                                                style={{
                                                    background: chatWallpaper
                                                        ? (chatWallpaper.startsWith('data:') || chatWallpaper.startsWith('http'))
                                                            ? `url(${chatWallpaper}) center/cover no-repeat`
                                                            : chatWallpaper
                                                        : (isDarkMode ? 'var(--canvas)' : '#f0f2f5'),
                                                    transition: 'all 0.5s ease-in-out'
                                                }}
                                            >
                                                {/* Wallpaper Pattern Overlay */}
                                                {chatOverlayPattern !== 'none' && (
                                                    <div
                                                        className={cn(
                                                            "absolute inset-0 pointer-events-none z-0 transition-opacity duration-500",
                                                            isDarkMode ? "opacity-[0.7]" : "opacity-[0.4]"
                                                        )}
                                                        style={{
                                                            backgroundImage: CHAT_OVERLAY_PATTERNS[chatOverlayPattern],
                                                            backgroundSize: (chatOverlayPattern === 'mosaic' || chatOverlayPattern === 'lattice' || chatOverlayPattern === 'custom') ? '80px 80px' : '100px 100px'
                                                        }}
                                                    />
                                                )}

                                                {/* Chat Messages Area */}
                                                <div
                                                    ref={scrollRef}
                                                    data-lenis-prevent
                                                    className="flex-grow overflow-y-auto p-4 sm:p-6 custom-scrollbar scroll-smooth relative z-10 bg-transparent"
                                                >
                                                    {/* Scroll to Bottom Button */}
                                                    <AnimatePresence>
                                                        {showScrollButton && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                                                className="absolute bottom-6 right-6 z-30"
                                                            >
                                                                <Button
                                                                    onClick={() => {
                                                                        if (scrollRef.current) {
                                                                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                                                                        }
                                                                    }}
                                                                    className="w-10 h-10 rounded-full bg-accent hover:bg-accent/80 text-white shadow-lg glow border border-white/20"
                                                                    size="icon"
                                                                >
                                                                    <ArrowDown className="w-5 h-5" />
                                                                </Button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    <div className="flex flex-col gap-3 min-h-full">

                                                        {(messages[selectedFriend.id] || [])
                                                            .filter(msg => !msg.deletedForMe)
                                                            .map((msg) => (
                                                                <div
                                                                    key={msg.id}
                                                                    ref={el => messageRefs.current[msg.id] = el}
                                                                    className={cn(
                                                                        (msg as any).isSystem
                                                                            ? "w-full flex justify-center p-0 bg-transparent shadow-none animate-in fade-in slide-in-from-bottom-2 duration-300"
                                                                            : cn(
                                                                                "max-w-[85%] md:max-w-[75%] lg:max-w-[70%] px-5 py-3.5 rounded-[22px] relative animate-in fade-in slide-in-from-bottom-2 duration-300 transition-all cursor-pointer group/msg shadow-lg",
                                                                                msg.type === 'text' && isOnlyEmoji(msg.text) && msg.text.trim().length <= 4
                                                                                    ? "bg-transparent shadow-none border-none p-0 flex flex-col items-center" + (msg.sender === 'me' ? " self-end" : " self-start")
                                                                                    : msg.sender === 'me'
                                                                                        ? cn(
                                                                                            "bg-green-900 text-white self-end rounded-tr-none border border-brand/25",
                                                                                            ""
                                                                                        )
                                                                                        : cn(
                                                                                            "self-start rounded-tl-none border",
                                                                                            isDarkMode
                                                                                                ? "bg-panel-3 hover:bg-white/[0.09] text-white border-line backdrop-blur-2xl shadow-xl shadow-black/40"
                                                                                                : "bg-panel-3 hover:bg-white/[0.09] text-white border-line shadow-lg shadow-neutral-900/10"
                                                                                        ),
                                                                                msg.isDeleted && "opacity-60 italic",
                                                                                selectedMessageIds.includes(msg.id) && cn(
                                                                                    "ring-2 ring-offset-2",
                                                                                    isDarkMode ? "ring-sky-400 ring-offset-canvas" : "ring-sky-500 ring-offset-white"
                                                                                )
                                                                            )
                                                                    )}
                                                                    onClick={() => isSelectMode && toggleMessageSelection(msg.id)}
                                                                >
                                                                    {isSelectMode && (
                                                                        <div className={cn(
                                                                            "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                            msg.sender === 'me' ? "-left-10" : "-right-10",
                                                                            selectedMessageIds.includes(msg.id)
                                                                                ? (isDarkMode ? "bg-accent border-accent" : "bg-sky-500 border-sky-500")
                                                                                : (isDarkMode ? "border-white/20" : "border-black/20")
                                                                        )}>
                                                                            {selectedMessageIds.includes(msg.id) && <Check className="w-3 h-3 text-white" />}
                                                                        </div>
                                                                    )}
                                                                    <ContextMenu open={openContextMenuId === msg.id} onOpenChange={(open) => setOpenContextMenuId(open ? msg.id : null)}>
                                                                        <ContextMenuTrigger className="text-left w-full outline-none">
                                                                            {(msg as any).isSystem ? (
                                                                                <div className="flex justify-center my-4">
                                                                                    <span className={cn(
                                                                                        "text-xs px-3 py-1 rounded-full border uppercase tracking-wider font-bold transition-colors duration-500 shadow-sm",
                                                                                        msg.sender === 'me' && selectedFriend.adminIds?.includes(12345)
                                                                                            ? "bg-green-900 text-white border-brand/25"
                                                                                            : "bg-panel-3 text-white border-line"
                                                                                    )}>
                                                                                        {(msg as any).text}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <div className="flex flex-col">
                                                                                        {/* Reply To Preview in Bubble */}
                                                                                        {msg.replyTo && (
                                                                                            <div className={cn("mb-2 p-2 rounded-lg border-l-4 border-accent text-[11px] opacity-80 cursor-pointer transition-colors", isDarkMode ? "bg-black/20" : "bg-neutral-100 hover:bg-neutral-200")} onClick={() => scrollToMessage(msg.replyTo.id)}>
                                                                                                <p className="font-bold text-accent">{msg.replyTo.sender === 'me' ? "You" : selectedFriend.name}</p>
                                                                                                <p className={cn("truncate line-clamp-1", isDarkMode ? "text-white" : "text-neutral-700")}>{msg.replyTo.text}</p>
                                                                                            </div>
                                                                                        )}

                                                                                        {msg.isDeleted ? (
                                                                                            <div className={cn("flex items-center gap-2 mb-1", isDarkMode ? "text-white/40" : "text-neutral-400")}>
                                                                                                <Trash2 className="w-3 h-3" />
                                                                                                <p className="text-[11px]">This message was deleted</p>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <>
                                                                                                {msg.type === 'image' && (
                                                                                                    <div
                                                                                                        className="w-full max-w-[300px] overflow-hidden rounded-xl mb-2 border border-line cursor-zoom-in shadow-inner"
                                                                                                        onClick={(e) => {
                                                                                                            if (isSelectMode) return;
                                                                                                            e.stopPropagation();
                                                                                                            setMediaPreview({ type: 'image', url: (msg as any).mediaUrl || "/placeholder.svg", name: msg.text });
                                                                                                            setMediaZoom(1);
                                                                                                        }}
                                                                                                    >
                                                                                                        <img src={(msg as any).mediaUrl || "/placeholder.svg"} alt="Sent media" className="w-full h-auto object-cover max-h-[300px]" />
                                                                                                    </div>
                                                                                                )}
                                                                                                {msg.type === 'video' && (
                                                                                                    <div
                                                                                                        className="w-full max-w-[300px] overflow-hidden rounded-xl mb-2 border border-white/20 relative group/vid cursor-pointer shadow-md"
                                                                                                        onClick={(e) => {
                                                                                                            if (isSelectMode) return;
                                                                                                            e.stopPropagation();
                                                                                                            setMediaPreview({ type: 'video', url: (msg as any).mediaUrl || "", name: msg.text });
                                                                                                        }}
                                                                                                    >
                                                                                                        <video src={(msg as any).mediaUrl} className="w-full h-auto object-cover max-h-[300px]" />
                                                                                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-100 group-hover/vid:bg-black/40 transition-all">
                                                                                                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30" >
                                                                                                                <Play className="w-6 h-6 text-white fill-white" />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                {msg.type === 'voice' && (
                                                                                                    <div className={cn("flex flex-col gap-2 mb-1 min-w-[200px] p-3 rounded-2xl border shadow-md", msg.sender === 'me' ? "bg-white/10 border-white/20" : "bg-white/10 border-line")}>
                                                                                                        <div className="flex items-center gap-3">
                                                                                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm", msg.sender === 'me' ? "bg-white/20 text-white" : "bg-warn/20 text-warn")}>
                                                                                                                <Mic className="w-5 h-5" />
                                                                                                            </div>
                                                                                                            <div className="flex-grow">
                                                                                                                <p className={cn("text-[11px] font-bold mb-1 uppercase tracking-wider", msg.sender === 'me' ? "text-white/80" : (isDarkMode ? "text-white/70" : "text-neutral-500"))}>{msg.text}</p>
                                                                                                                <audio controls src={(msg as any).mediaUrl} className="h-8 w-full custom-audio-player" />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                {msg.type === 'file' && (
                                                                                                    <div
                                                                                                        className={cn("flex items-center gap-3 mb-1 p-3.5 rounded-2xl border cursor-pointer transition-colors shadow-md", msg.sender === 'me' ? "bg-white/10 border-white/20 hover:bg-white/15" : "bg-white/10 border-line hover:bg-white/10")}
                                                                                                        onClick={(e) => {
                                                                                                            if (isSelectMode) return;
                                                                                                            e.stopPropagation();
                                                                                                            setMediaPreview({ type: 'file', url: (msg as any).mediaUrl || "#", name: msg.text });
                                                                                                        }}
                                                                                                    >
                                                                                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm", msg.sender === 'me' ? "bg-white/20 text-white" : "bg-warn/20 text-warn")}>
                                                                                                            <Paperclip className="w-5 h-5" />
                                                                                                        </div>
                                                                                                        <div className="flex-grow min-w-0">
                                                                                                            <p className="truncate font-semibold text-[15px]">{msg.text}</p>
                                                                                                            <p className="text-[11px] opacity-50 font-medium uppercase tracking-tight">Document • PDF</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                {msg.type === 'text' && (
                                                                                                    <p className={cn(
                                                                                                        "whitespace-pre-wrap break-words leading-[1.6] relative z-0 text-[15px] font-[450] tracking-wide",
                                                                                                        isOnlyEmoji(msg.text) && msg.text.trim().length <= 4 ? "text-[48px] my-1 leading-tight mb-2" : ""
                                                                                                    )}>
                                                                                                        {renderTextWithLinks(msg.text, msg.sender)}
                                                                                                    </p>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className={cn(
                                                                                        "flex items-center gap-1.5 mt-2 opacity-80",
                                                                                        msg.type === 'text' && isOnlyEmoji(msg.text) && msg.text.trim().length <= 4
                                                                                            ? "justify-center"
                                                                                            : "justify-end"
                                                                                    )}>
                                                                                        {msg.isForwarded && <span className="text-[10px] italic mr-1 text-white/50">Forwarded</span>}
                                                                                        {msg.isPinned && <Pin className="w-3 h-3 text-white/50 fill-white/50" />}
                                                                                        {msg.isStarred && <Star className="w-3 h-3 text-white/50 fill-white/50" />}
                                                                                        <span className="text-[10.5px] font-semibold tracking-tight text-white/70">{msg.time}</span>
                                                                                        {msg.sender === 'me' && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                                                                                    </div>
                                                                                    {msg.reaction && (
                                                                                        <div className={cn(
                                                                                            "absolute -bottom-2 flex items-center justify-center rounded-full p-1 shadow-lg border animate-in zoom-in-50 duration-200 z-10",
                                                                                            msg.sender === 'me' ? "right-2" : "left-2",
                                                                                            isDarkMode ? "bg-[#1E2433] border-line" : "bg-white border-black/5"
                                                                                        )}>
                                                                                            <span className="text-sm leading-none">{msg.reaction}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </ContextMenuTrigger>
                                                                        {!msg.isDeleted && (
                                                                            <ContextMenuContent className={cn("backdrop-blur-xl border w-64 rounded-2xl shadow-2xl p-2 z-[100] ring-1 transition-colors", isDarkMode ? "bg-panel/90 border-line text-white ring-white/5" : "bg-white/95 border-black/10 text-neutral-800 ring-black/5")}>
                                                                                {/* Emoji Reactions Row */}
                                                                                <div className={cn("flex items-center justify-between px-2 py-2 mb-2 rounded-xl transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-100")}>
                                                                                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                                                        <button
                                                                                            key={emoji}
                                                                                            className={cn(
                                                                                                "text-xl hover:scale-130 transition-transform active:scale-90 p-1 rounded-lg",
                                                                                                msg.reaction === emoji && (isDarkMode ? "bg-accent/20 scale-110" : "bg-sky-500/20 scale-110")
                                                                                            )}
                                                                                            onClick={(e) => {
                                                                                                e.preventDefault();
                                                                                                handleMessageReaction(msg.id, emoji);
                                                                                            }}
                                                                                        >
                                                                                            {emoji}
                                                                                        </button>
                                                                                    ))}
                                                                                    <Popover>
                                                                                        <PopoverTrigger asChild>
                                                                                            <button className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", isDarkMode ? "bg-white/10 text-white/60 hover:text-white hover:bg-white/20" : "bg-black/10 text-neutral-500 hover:text-neutral-900 hover:bg-black/20")}>
                                                                                                <Plus className="w-4 h-4" />
                                                                                            </button>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent side="right" align="start" className={cn("backdrop-blur-xl border w-[300px] p-2 rounded-2xl shadow-2xl z-[110] transition-colors", isDarkMode ? "bg-panel-2/90 border-line text-white" : "bg-white/95 border-black/10 text-neutral-900")}>
                                                                                            <Command className="bg-transparent">
                                                                                                <CommandInput placeholder="Search emoji..." className={cn("h-9 border-none focus:ring-0", isDarkMode ? "text-white" : "text-neutral-900")} />
                                                                                                <CommandList className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                                                                    <CommandEmpty>No results found.</CommandEmpty>
                                                                                                    {EMOJI_CATEGORIES.map(category => (
                                                                                                        <CommandGroup key={category.name} heading={category.name} className={cn("px-2", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                                                            <div className="grid grid-cols-7 gap-1">
                                                                                                                {category.emojis.map((emoji, i) => (
                                                                                                                    <CommandItem
                                                                                                                        key={`${category.name}-${emoji.char}-${i}`}
                                                                                                                        value={`${emoji.name} ${emoji.keywords}`}
                                                                                                                        onSelect={() => handleMessageReaction(msg.id, emoji.char)}
                                                                                                                        className={cn("flex items-center justify-center p-0 h-8 w-8 rounded-lg cursor-pointer transition-colors", isDarkMode ? "hover:bg-white/10 aria-selected:bg-white/10" : "hover:bg-neutral-100 aria-selected:bg-neutral-100")}
                                                                                                                    >
                                                                                                                        <span className="text-lg">{emoji.char}</span>
                                                                                                                    </CommandItem>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </CommandGroup>
                                                                                                    ))}
                                                                                                </CommandList>
                                                                                            </Command>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                </div>

                                                                                <ContextMenuItem onClick={() => setMessageInfo(msg)} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")}>
                                                                                    <Info className={cn("w-4 h-5", isDarkMode ? "text-white/60" : "text-neutral-500")} />
                                                                                    <span className="flex-grow text-sm">Message info</span>
                                                                                </ContextMenuItem>

                                                                                <ContextMenuItem onClick={() => setReplyingTo(msg)} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")}>
                                                                                    <Reply className={cn("w-4 h-5", isDarkMode ? "text-white/60" : "text-neutral-500")} />
                                                                                    <span className="flex-grow text-sm">Reply</span>
                                                                                </ContextMenuItem>

                                                                                <ContextMenuItem onClick={() => copyToClipboard(msg.text)} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")}>
                                                                                    <Copy className={cn("w-4 h-5", isDarkMode ? "text-white/60" : "text-neutral-500")} />
                                                                                    <span className="flex-grow text-sm">Copy</span>
                                                                                </ContextMenuItem>

                                                                                <ContextMenuItem onClick={() => setIsForwarding(msg)} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")}>
                                                                                    <Forward className={cn("w-4 h-5", isDarkMode ? "text-white/60" : "text-neutral-500")} />
                                                                                    <span className="flex-grow text-sm">Forward</span>
                                                                                </ContextMenuItem>

                                                                                <ContextMenuItem onClick={() => togglePin(msg.id)} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")}>
                                                                                    <Pin className={cn("w-4 h-5", isDarkMode ? "text-white/60" : "text-neutral-500", msg.isPinned && (isDarkMode ? "fill-accent text-accent" : "fill-sky-500 text-sky-500"))} />
                                                                                    <span className="flex-grow text-sm">{msg.isPinned ? "Unpin" : "Pin"}</span>
                                                                                </ContextMenuItem>

                                                                                <ContextMenuItem onClick={() => toggleStar(msg.id)} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")}>
                                                                                    <Star className={cn("w-4 h-5", isDarkMode ? "text-white/60" : "text-neutral-500", msg.isStarred && "fill-yellow-400 text-yellow-400")} />
                                                                                    <span className="flex-grow text-sm">{msg.isStarred ? "Unstar" : "Star"}</span>
                                                                                </ContextMenuItem>

                                                                                <ContextMenuSeparator className={cn("my-1.5 transition-colors", isDarkMode ? "bg-white/5" : "bg-black/5")} />

                                                                                <ContextMenuItem onClick={() => enterSelectMode(msg.id)} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors", isDarkMode ? "focus:bg-white/10 focus:text-white" : "focus:bg-neutral-100 focus:text-neutral-900")}>
                                                                                    <Check className={cn("w-4 h-5", isDarkMode ? "text-white/60" : "text-neutral-500")} />
                                                                                    <span className="flex-grow text-sm">Select</span>
                                                                                </ContextMenuItem>

                                                                                <ContextMenuSeparator className={cn("my-1.5 transition-colors", isDarkMode ? "bg-white/5" : "bg-black/5")} />

                                                                                <ContextMenuItem onClick={() => setDeleteConfirm({ id: msg.id, type: 'me' })} className={cn("gap-3 py-2.5 cursor-pointer rounded-xl px-3 transition-colors text-red-500", isDarkMode ? "focus:bg-red-500/10 focus:text-red-400" : "focus:bg-red-50 focus:text-red-700")}>
                                                                                    <Trash2 className="w-4 h-5" />
                                                                                    <span className="flex-grow text-sm font-medium">Delete</span>
                                                                                </ContextMenuItem>
                                                                            </ContextMenuContent>
                                                                        )}

                                                                    </ContextMenu>
                                                                </div>
                                                            ))}
                                                        <div id="scroll-anchor" className="h-0" />
                                                    </div>
                                                </div>

                                                {/* Reply Preview Above InputBar */}
                                                {replyingTo && (
                                                    <div className={cn(
                                                        "flex-shrink-0 px-4 py-2 border-t transition-colors duration-500",
                                                        isDarkMode ? "bg-panel-2 border-line" : "bg-neutral-50 border-black/5"
                                                    )}>
                                                        <div className={cn(
                                                            "p-3 rounded-xl border-l-4 border-accent flex items-center justify-between",
                                                            isDarkMode ? "bg-white/5" : "bg-white shadow-sm"
                                                        )}>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-accent">{replyingTo.sender === 'me' ? "You" : selectedFriend.name}</p>
                                                                <p className={cn("text-sm truncate transition-colors", isDarkMode ? "text-white/60" : "text-neutral-600")}>{replyingTo.text}</p>
                                                            </div>
                                                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 transition-colors", isDarkMode ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-900")} onClick={() => setReplyingTo(null)}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex-shrink-0 p-4 sm:p-6 relative z-20">
                                                    <div className={cn(
                                                        "absolute inset-x-0 bottom-0 h-32 pointer-events-none -z-10 transition-colors duration-500",
                                                        isDarkMode ? "bg-gradient-to-t from-panel to-transparent" : "bg-gradient-to-t from-[#f0f2f5] to-transparent"
                                                    )} />
                                                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage() }} className={cn(
                                                        "flex items-center gap-2 sm:gap-3 p-2 rounded-2xl shadow-2xl transition-all duration-500",
                                                        isDarkMode
                                                            ? "bg-panel-3/70 backdrop-blur-xl border border-line ring-1 ring-white/5"
                                                            : "bg-white border border-black/5 ring-1 ring-black/5 shadow-neutral-200"
                                                    )}>

                                                        {/* Hidden Inputs */}
                                                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileSelect(e, 'file')} accept="*/*" />
                                                        <input type="file" ref={imageInputRef} accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />

                                                        {selectedFriend.isBlocked ? (
                                                            <div className="flex-grow flex items-center justify-center gap-4 py-2 mx-2">
                                                                <span className={cn("text-sm font-medium hidden sm:inline-block", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                                    You blocked this contact
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFriendsList(prev => prev.map(f => f.id === selectedFriend.id ? { ...f, isBlocked: false } : f))
                                                                        toast({ title: "Unblocked", description: `${selectedFriend.name} has been unblocked.` })
                                                                    }}
                                                                    variant="secondary"
                                                                    className={cn("rounded-xl font-bold", isDarkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-neutral-200 hover:bg-neutral-300 text-neutral-900")}
                                                                >
                                                                    Unblock
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => setFriendDeleteConfirm(selectedFriend)}
                                                                    className="rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20"
                                                                >
                                                                    Delete User
                                                                </Button>
                                                            </div>
                                                        ) : selectedFriend.isExited ? (
                                                            <div className="flex-grow py-3 text-center bg-white/5 rounded-2xl border border-line mx-2">
                                                                <p className="text-white/40 text-sm italic">You can't send messages to this group because you're no longer a participant.</p>
                                                            </div>
                                                        ) : selectedFriend.groupSettings?.onlyAdminsCanSendMessages && !selectedFriend.adminIds?.includes(12345) ? (
                                                            <div className="flex-grow py-3 text-center bg-white/5 rounded-2xl border border-line mx-2">
                                                                <p className="text-white/40 text-sm italic">Only admins can send messages to this group.</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                                                    {!isRecording && !recordedVoice ? (
                                                                        <>
                                                                            <Button
                                                                                onClick={() => openCamera('message')}
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className={cn("rounded-full h-10 w-10 transition-all hover:bg-sky-500/10 active:scale-95", isDarkMode ? "text-white/40 hover:text-sky-400" : "text-neutral-500 hover:text-sky-600")}
                                                                                title="Camera"
                                                                            >
                                                                                <Camera className="w-5 h-5" />
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() => fileInputRef.current?.click()}
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className={cn("rounded-full h-10 w-10 transition-all hover:bg-sky-500/10 active:scale-95", isDarkMode ? "text-white/40 hover:text-sky-400" : "text-neutral-500 hover:text-sky-600")}
                                                                                title="Document"
                                                                            >
                                                                                <Paperclip className="w-5 h-5" />
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() => imageInputRef.current?.click()}
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className={cn("rounded-full h-10 w-10 transition-all hover:bg-sky-500/10 active:scale-95", isDarkMode ? "text-white/40 hover:text-sky-400" : "text-neutral-500 hover:text-sky-600")}
                                                                                title="Gallery"
                                                                            >
                                                                                <ImageIcon className="w-5 h-5" />
                                                                            </Button>
                                                                            <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className={cn("rounded-full h-10 w-10 transition-all hover:bg-sky-500/10 active:scale-95", isDarkMode ? "text-white/40 hover:text-sky-400" : "text-neutral-500 hover:text-sky-600")}
                                                                                        title="Emoji"
                                                                                    >
                                                                                        <Smile className="w-5 h-5" />
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent
                                                                                    side="top"
                                                                                    align="start"
                                                                                    className={cn("w-[320px] p-0 overflow-hidden shadow-2xl mb-2", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}
                                                                                >
                                                                                    <Command className="bg-transparent">
                                                                                        <CommandInput
                                                                                            placeholder="Search emoji..."
                                                                                            className="border-none focus:ring-0 text-sm h-10"
                                                                                        />
                                                                                        <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                                            <CommandEmpty className="py-6 text-center text-sm text-white/40">No results found.</CommandEmpty>
                                                                                            <Tabs defaultValue={EMOJI_CATEGORIES[0].name} className="w-full">
                                                                                                <div className="px-2 pt-2 pb-1 border-b border-line">
                                                                                                    <TabsList className="bg-white/5 w-full flex justify-between h-8 p-1">
                                                                                                        {EMOJI_CATEGORIES.map(cat => (
                                                                                                            <TabsTrigger
                                                                                                                key={cat.name}
                                                                                                                value={cat.name}
                                                                                                                className="flex-grow text-[10px] px-1 data-[state=active]:bg-accent data-[state=active]:text-canvas"
                                                                                                            >
                                                                                                                {cat.name.split(' ')[0]}
                                                                                                            </TabsTrigger>
                                                                                                        ))}
                                                                                                    </TabsList>
                                                                                                </div>
                                                                                                {EMOJI_CATEGORIES.map(category => (
                                                                                                    <TabsContent
                                                                                                        key={category.name}
                                                                                                        value={category.name}
                                                                                                        className="m-0 focus-visible:outline-none"
                                                                                                    >
                                                                                                        <CommandGroup heading={category.name} className="px-2 pb-2">
                                                                                                            <div className="grid grid-cols-8 gap-1">
                                                                                                                {category.emojis.map((emoji, i) => (
                                                                                                                    <CommandItem
                                                                                                                        key={`${category.name}-${emoji.char}-${i}`}
                                                                                                                        value={`${emoji.name} ${emoji.keywords}`}
                                                                                                                        onSelect={() => {
                                                                                                                            addEmoji(emoji.char)
                                                                                                                            setIsEmojiPickerOpen(false)
                                                                                                                        }}
                                                                                                                        className="flex items-center justify-center p-0 h-8 w-8 rounded-lg cursor-pointer hover:bg-white/10 transition-colors aria-selected:bg-white/10"
                                                                                                                    >
                                                                                                                        <span className="text-xl leading-none">{emoji.char}</span>
                                                                                                                    </CommandItem>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </CommandGroup>
                                                                                                    </TabsContent>
                                                                                                ))}
                                                                                            </Tabs>
                                                                                        </CommandList>
                                                                                    </Command>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </>
                                                                    ) : isRecording ? (
                                                                        <div className="flex items-center gap-3 px-2 flex-grow min-w-0">
                                                                            <Button
                                                                                onClick={cancelRecording}
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full h-9 w-9"
                                                                            >
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </Button>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                                                                <span className={cn("font-mono text-sm", isDarkMode ? "text-white" : "text-neutral-800")}>
                                                                                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-white/40 text-xs truncate">Recording...</div>
                                                                        </div>
                                                                    ) : recordedVoice ? (
                                                                        <div className="flex items-center gap-3 px-2 flex-grow min-w-0">
                                                                            <Button
                                                                                onClick={cancelRecording}
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-full h-9 w-9"
                                                                            >
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </Button>
                                                                            <div className={cn("flex items-center gap-2 p-1 px-3 rounded-full border transition-colors", isDarkMode ? "bg-white/5 border-line" : "bg-neutral-100 border-black/5")}>
                                                                                <Mic className="w-4 h-4 text-accent" />
                                                                                <span className={cn("text-[11px]", isDarkMode ? "text-white/60" : "text-neutral-600")}>Voice ({recordedVoice.duration}s)</span>
                                                                            </div>
                                                                            <audio src={recordedVoice.url} className="hidden" id="review-audio" />
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-accent"
                                                                                onClick={() => {
                                                                                    const audio = document.getElementById('review-audio') as HTMLAudioElement;
                                                                                    audio?.play();
                                                                                }}
                                                                            >
                                                                                <Play className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : null}
                                                                </div>

                                                                <div className="flex-grow">
                                                                    <Input
                                                                        placeholder="Type a message..."
                                                                        className={cn(
                                                                            "border-none h-10 rounded-2xl focus-visible:ring-accent/50 transition-colors",
                                                                            isDarkMode
                                                                                ? "bg-white/5 text-white placeholder:text-white/20"
                                                                                : "bg-neutral-100 text-neutral-900 placeholder:text-neutral-400 border border-black/5"
                                                                        )}
                                                                        value={newMessage}
                                                                        onChange={(e) => setNewMessage(e.target.value)}
                                                                    />
                                                                </div>

                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    {newMessage.trim() || recordedVoice ? (
                                                                        <Button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                if (recordedVoice) sendRecordedVoice();
                                                                                else handleSendMessage();
                                                                            }}
                                                                            className="tile-accent hover:from-sky-400 hover:to-indigo-500 text-white h-11 w-11 rounded-2xl shadow-lg shadow-sky-500/20 transition-all active:scale-95"
                                                                        >
                                                                            <Send className="w-5 h-5" />
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            onClick={isRecording ? stopRecording : startRecording}
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={cn(
                                                                                "rounded-full transition-all h-11 w-11 hover:bg-sky-500/10 active:scale-90",
                                                                                isRecording ? "text-red-500 bg-red-500/10 animate-pulse" : (isDarkMode ? "text-white/40 hover:text-sky-400" : "text-neutral-500 hover:text-sky-600")
                                                                            )}
                                                                            title={isRecording ? "Stop Recording" : "Click to Record"}
                                                                        >
                                                                            <Mic className="w-5 h-5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </form>
                                                </div>

                                            </div>
                                        </div>
                                    </div>

                                    {/* Camera Side Panel */}
                                    {isCameraOpen && (
                                        <div className={cn(
                                            "flex-shrink-0 w-full border-l flex flex-col transition-all duration-300 relative",
                                            isDarkMode ? "bg-black border-line" : "bg-black border-black/10"
                                        )}>
                                            {/* Camera Header / Editor Toolbar */}
                                            <div className="absolute top-4 inset-x-4 flex justify-between items-center z-50">
                                                {capturedImage ? (
                                                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1 rounded-full border border-line">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                if (isImageFromGallery) {
                                                                    closeCamera();
                                                                } else {
                                                                    setCapturedImage(null);
                                                                    setActiveEditorTool(null);
                                                                    setAppliedFilter('none');
                                                                    clearCanvas();
                                                                }
                                                            }}
                                                            className="text-white hover:bg-white/10 rounded-full h-10 w-10"
                                                        >
                                                            <ArrowLeft className="w-5 h-5" />
                                                        </Button>
                                                        <div className="h-4 w-[1px] bg-white/20 mx-1" />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setActiveEditorTool(prev => prev === 'crop' ? null : 'crop')}
                                                            className={cn("text-white hover:bg-white/10 rounded-full h-10 w-10 transition-colors", activeEditorTool === 'crop' && "bg-white/20 text-sky-400")}
                                                        >
                                                            <Crop className="w-5 h-5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setActiveEditorTool(prev => prev === 'filter' ? null : 'filter')}
                                                            className={cn("text-white hover:bg-white/10 rounded-full h-10 w-10 transition-colors", activeEditorTool === 'filter' && "bg-white/20 text-sky-400")}
                                                        >
                                                            <Wand2 className="w-5 h-5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setActiveEditorTool(prev => prev === 'marker' ? null : 'marker')}
                                                            className={cn("text-white hover:bg-white/10 rounded-full h-10 w-10 transition-colors", activeEditorTool === 'marker' && "bg-white/20 text-sky-400")}
                                                        >
                                                            <Pencil className="w-5 h-5" />
                                                        </Button>
                                                        {activeEditorTool === 'marker' && (
                                                            <>
                                                                <div className="h-4 w-[1px] bg-white/20 mx-1" />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={clearCanvas}
                                                                    className="text-white hover:bg-white/10 rounded-full h-10 w-10"
                                                                >
                                                                    <Eraser className="w-5 h-5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex-grow" />
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={closeCamera}
                                                    className="bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10 backdrop-blur-md border border-line"
                                                >
                                                    <X className="w-5 h-5" />
                                                </Button>
                                            </div>

                                            {/* Camera Viewport */}
                                            <div className="flex-grow flex items-center justify-center bg-black overflow-hidden relative group h-full w-full">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    className={cn(
                                                        "w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 absolute inset-0",
                                                        capturedImage ? "opacity-0 z-0" : "opacity-100 z-10"
                                                    )}
                                                />
                                                {capturedImage && (
                                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                                                        <img
                                                            ref={editorImageRef}
                                                            src={capturedImage}
                                                            alt="Captured"
                                                            className="w-full h-full object-contain transition-all"
                                                            style={{ filter: appliedFilter === 'none' ? undefined : appliedFilter }}
                                                        />
                                                        {activeEditorTool === 'crop' && (
                                                            <div className="absolute inset-0 z-40">
                                                                {/* Darkened outside areas */}
                                                                <div className="absolute inset-0 bg-black/60" style={{ clipPath: `polygon(0% 0%, 0% 100%, ${cropArea.x}% 100%, ${cropArea.x}% ${cropArea.y}%, ${cropArea.x + cropArea.width}% ${cropArea.y}%, ${cropArea.x + cropArea.width}% ${cropArea.y + cropArea.height}%, ${cropArea.x}% ${cropArea.y + cropArea.height}%, ${cropArea.x}% 100%, 100% 100%, 100% 0%)` }} />

                                                                {/* Crop Area Box */}
                                                                <motion.div
                                                                    drag
                                                                    dragMomentum={false}
                                                                    onDrag={(e, info) => {
                                                                        const rect = editorImageRef.current?.getBoundingClientRect();
                                                                        if (!rect) return;
                                                                        const dx = (info.delta.x / rect.width) * 100;
                                                                        const dy = (info.delta.y / rect.height) * 100;

                                                                        setCropArea(prev => ({
                                                                            ...prev,
                                                                            x: Math.max(0, Math.min(100 - prev.width, prev.x + dx)),
                                                                            y: Math.max(0, Math.min(100 - prev.height, prev.y + dy))
                                                                        }));
                                                                    }}
                                                                    style={{
                                                                        left: `${cropArea.x}%`,
                                                                        top: `${cropArea.y}%`,
                                                                        width: `${cropArea.width}%`,
                                                                        height: `${cropArea.height}%`
                                                                    }}
                                                                    className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move"
                                                                >
                                                                    {/* Resize handles */}
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('nw', info)}
                                                                        className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-white cursor-nw-resize z-50 p-2"
                                                                    />
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('ne', info)}
                                                                        className="absolute -top-3 -right-3 w-6 h-6 border-t-4 border-r-4 border-white cursor-ne-resize z-50 p-2"
                                                                    />
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('sw', info)}
                                                                        className="absolute -bottom-3 -left-3 w-6 h-6 border-b-4 border-l-4 border-white cursor-sw-resize z-50 p-2"
                                                                    />
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('se', info)}
                                                                        className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-white cursor-se-resize z-50 p-2"
                                                                    />
                                                                    {/* Edge handles */}
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('n', info)}
                                                                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/50 hover:bg-white rounded-full cursor-n-resize z-50"
                                                                    />
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('s', info)}
                                                                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/50 hover:bg-white rounded-full cursor-s-resize z-50"
                                                                    />
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('e', info)}
                                                                        className="absolute top-1/2 -right-3 -translate-y-1/2 w-2 h-8 bg-white/50 hover:bg-white rounded-full cursor-e-resize z-50"
                                                                    />
                                                                    <motion.div
                                                                        drag
                                                                        dragMomentum={false}
                                                                        onDrag={(e, info) => handleCropResize('w', info)}
                                                                        className="absolute top-1/2 -left-3 -translate-y-1/2 w-2 h-8 bg-white/50 hover:bg-white rounded-full cursor-w-resize z-50"
                                                                    />

                                                                    {/* Grid lines */}
                                                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                                                                        <div className="border-r border-white" />
                                                                        <div className="border-r border-white" />
                                                                        <div className="border-b border-white" />
                                                                        <div className="border-b border-white" />
                                                                        <div className="border-b border-white" />
                                                                        <div className="border-b border-white" />
                                                                    </div>
                                                                </motion.div>
                                                            </div>
                                                        )}
                                                        <canvas
                                                            ref={editorCanvasRef}
                                                            className={cn(
                                                                "absolute inset-0 w-full h-full z-30 touch-none",
                                                                activeEditorTool === 'marker' ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
                                                            )}
                                                            onMouseDown={startDrawing}
                                                            onMouseMove={draw}
                                                            onMouseUp={stopDrawing}
                                                            onMouseLeave={stopDrawing}
                                                            onTouchStart={startDrawing}
                                                            onTouchMove={draw}
                                                            onTouchEnd={stopDrawing}
                                                        />
                                                    </div>
                                                )}

                                                {/* Tool Controls Overlay */}
                                                {capturedImage && activeEditorTool && (
                                                    <div className="absolute bottom-32 inset-x-0 px-8 z-40 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-300">
                                                        {activeEditorTool === 'filter' && (
                                                            <div className="w-full flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                                                {[
                                                                    { name: 'None', val: 'none' },
                                                                    { name: 'B&W', val: 'grayscale(1)' },
                                                                    { name: 'Sepia', val: 'sepia(1)' },
                                                                    { name: 'Vibrant', val: 'saturate(2)' },
                                                                    { name: 'Cool', val: 'hue-rotate(180deg)' },
                                                                    { name: 'Bright', val: 'brightness(1.5)' },
                                                                    { name: 'Contrast', val: 'contrast(1.5)' },
                                                                ].map((f) => (
                                                                    <button
                                                                        key={f.name}
                                                                        onClick={() => setAppliedFilter(f.val)}
                                                                        className={cn(
                                                                            "flex-shrink-0 flex flex-col items-center gap-2 transition-all p-2 rounded-2xl",
                                                                            appliedFilter === f.val ? "bg-white/20 border border-white/20" : "bg-transparent"
                                                                        )}
                                                                    >
                                                                        <div
                                                                            className="w-16 h-16 rounded-xl bg-zinc-800 border border-line overflow-hidden"
                                                                            style={{ filter: f.val }}
                                                                        >
                                                                            <img src={capturedImage} className="w-full h-full object-cover" />
                                                                        </div>
                                                                        <span className="text-[10px] text-white font-medium">{f.name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {activeEditorTool === 'marker' && (
                                                            <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-line flex items-center gap-4">
                                                                <div className="flex gap-2">
                                                                    {['var(--text)', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(c => (
                                                                        <button
                                                                            key={c}
                                                                            onClick={() => setMarkerColor(c)}
                                                                            className={cn(
                                                                                "w-6 h-6 rounded-full border-2 transition-transform",
                                                                                markerColor === c ? "scale-125 border-white" : "border-transparent"
                                                                            )}
                                                                            style={{ backgroundColor: c }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <div className="h-4 w-[1px] bg-white/20 mx-1" />
                                                                <input
                                                                    type="range"
                                                                    min="1" max="20"
                                                                    value={brushSize}
                                                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                                                    className="w-24 accent-sky-500"
                                                                />
                                                            </div>
                                                        )}

                                                        {activeEditorTool === 'crop' && (
                                                            <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-line flex items-center gap-3">
                                                                {[
                                                                    { name: 'Original', x: 10, y: 10, w: 80, h: 80 },
                                                                    { name: 'Square', x: 25, y: 10, w: 50, h: 50 },
                                                                    { name: '4:3', x: 15, y: 10, w: 70, h: 52 },
                                                                    { name: '16:9', x: 10, y: 20, w: 80, h: 45 },
                                                                ].map((preset) => (
                                                                    <Button
                                                                        key={preset.name}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setCropArea({ x: preset.x, y: preset.y, width: preset.w, height: preset.h })}
                                                                        className="text-white hover:bg-white/10 rounded-xl px-4 text-xs h-8"
                                                                    >
                                                                        {preset.name}
                                                                    </Button>
                                                                ))}
                                                                <div className="h-4 w-[1px] bg-white/20 mx-1" />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setCropArea({ x: 0, y: 0, width: 100, height: 100 })}
                                                                    className="text-white hover:bg-white/10 rounded-xl px-4 text-xs h-8 text-red-400"
                                                                >
                                                                    Full
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Controls Overlay */}
                                                <div className="absolute bottom-0 inset-x-0 p-8 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent pt-20 z-30">

                                                    {!capturedImage ? (
                                                        <Button
                                                            onClick={capturePhoto}
                                                            className="w-20 h-20 bg-white rounded-full border-[5px] border-white/30 hover:scale-105 active:scale-95 transition-all shadow-2xl"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-8">
                                                            <Button
                                                                onClick={isImageFromGallery ? () => imageInputRef.current?.click() : retakePhoto}
                                                                variant="outline"
                                                                className="h-14 w-14 rounded-full border-2 border-white/20 bg-black/40 text-white hover:bg-white/10 hover:text-white hover:border-white transition-all backdrop-blur-md"
                                                            >
                                                                {isImageFromGallery ? <Upload className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                                                            </Button>
                                                            <Button
                                                                onClick={confirmSendPhoto}
                                                                className="h-16 w-16 rounded-full bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95"
                                                            >
                                                                <Send className="w-7 h-7 ml-1" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Immersive Media Preview Panel */}
                                    {mediaPreview && (
                                        <div className={cn(
                                            "flex-shrink-0 w-full border-l flex flex-col transition-all duration-300 relative",
                                            isDarkMode ? "bg-black border-line" : "bg-black border-black/10"
                                        )}>
                                            {/* Media Header */}
                                            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-40">
                                                <div className="flex items-center gap-3">
                                                    <Button variant="ghost" size="icon" onClick={() => setMediaPreview(null)} className="text-white hover:bg-white/10 rounded-full h-10 w-10 backdrop-blur-md bg-black/20">
                                                        <X className="w-6 h-6" />
                                                    </Button>
                                                    <div className="text-white drop-shadow-md">
                                                        <p className="font-bold text-sm">{mediaPreview?.name || "Preview"}</p>
                                                        <p className="text-[11px] opacity-60">{selectedFriend?.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {mediaPreview?.type === 'image' && (
                                                        <>
                                                            <Button variant="ghost" size="icon" onClick={() => setMediaZoom(prev => Math.max(0.5, prev - 0.25))} className="text-white hover:bg-white/10 rounded-full h-10 w-10 backdrop-blur-md bg-black/20">
                                                                <ZoomOut className="w-5 h-5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => setMediaZoom(prev => Math.min(3, prev + 0.25))} className="text-white hover:bg-white/10 rounded-full h-10 w-10 backdrop-blur-md bg-black/20">
                                                                <ZoomIn className="w-5 h-5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <a href={mediaPreview?.url} download={mediaPreview?.name || "download"} className="p-2 text-white hover:bg-white/10 rounded-full h-10 w-10 flex items-center justify-center backdrop-blur-md bg-black/20 transition-colors">
                                                        <Download className="w-5 h-5" />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Media Content Area */}
                                            <div className="flex-grow relative bg-black flex items-center justify-center overflow-hidden p-4 min-h-0 h-full">
                                                {mediaPreview?.type === 'image' && (
                                                    <motion.img
                                                        src={mediaPreview.url}
                                                        alt="Preview"
                                                        className="max-w-full max-h-full object-contain shadow-2xl"
                                                        style={{ scale: mediaZoom }}
                                                        drag={mediaZoom > 1}
                                                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                                    />
                                                )}
                                                {mediaPreview?.type === 'video' && (
                                                    <video
                                                        src={mediaPreview.url}
                                                        controls
                                                        autoPlay
                                                        className="max-w-full max-h-full shadow-2xl"
                                                    />
                                                )}
                                                {mediaPreview?.type === 'voice' && (
                                                    <div className="flex flex-col items-center gap-6 text-white text-center">
                                                        <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center shadow-lg border-2 border-accent/20">
                                                            <Mic className="w-12 h-12 text-accent" />
                                                        </div>
                                                        <div className="w-full max-w-md bg-white/5 p-8 rounded-3xl border border-line backdrop-blur-md">
                                                            <p className="text-xl font-bold mb-4">{mediaPreview.name || "Voice Message"}</p>
                                                            <audio
                                                                controls
                                                                autoPlay
                                                                src={mediaPreview.url}
                                                                className="w-full h-12 rounded-full accent-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {mediaPreview?.type === 'file' && (
                                                    <div className="flex flex-col items-center gap-6 text-white text-center">
                                                        <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg">
                                                            <FileText className="w-12 h-12 text-accent" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xl font-bold mb-2">{mediaPreview.name}</p>
                                                            <p className="text-white/40 mb-8">Document Preview Not Available</p>
                                                            <Button asChild className="bg-accent hover:bg-accent/80 text-white rounded-xl px-8 h-12 shadow-lg shadow-accent/20">
                                                                <a href={mediaPreview.url} download={mediaPreview.name}>
                                                                    Download File
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Calling Overlay */}
                                    <AnimatePresence>
                                        {callState !== 'idle' && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 1.1 }}
                                                className="fixed inset-0 z-[100] bg-canvas flex flex-col items-center justify-between py-20"
                                            >
                                                {/* Background for Video Call */}
                                                {callType === 'video' && (
                                                    <div className="absolute inset-0 z-0">
                                                        {isCameraPaused ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl">
                                                                <VideoOff className="w-20 h-20 text-white/20 animate-pulse" />
                                                                <p className="text-white/40 mt-4 font-medium">Camera Paused</p>
                                                            </div>
                                                        ) : (
                                                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-50" />
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                                                    </div>
                                                )}

                                                <div className="z-10 text-center flex flex-col items-center gap-6">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl animate-pulse" />
                                                        <Avatar className="w-32 h-32 border-4 border-line relative z-10 shadow-2xl">
                                                            <AvatarImage src={selectedFriend.image} />
                                                            <AvatarFallback className="text-4xl">{selectedFriend.name[0]}</AvatarFallback>
                                                        </Avatar>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <h2 className="text-3xl font-bold text-white">{selectedFriend.name}</h2>
                                                        <p className={cn(
                                                            "text-lg font-medium tracking-wide",
                                                            callState === 'ringing' ? "text-accent animate-pulse" : "text-white/60"
                                                        )}>
                                                            {callState === 'ringing' ? "Ringing..." :
                                                                callState === 'connected' ? formatDuration(callDuration) :
                                                                    "Call Ended"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="z-10 flex flex-col items-center gap-12 w-full max-w-sm px-6">
                                                    <div className="flex items-center justify-between w-full">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                                            className={cn("w-14 h-14 rounded-full transition-all", isSpeakerOn ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}
                                                        >
                                                            <Volume2 className="w-5 h-5" />
                                                        </Button>

                                                        {callType === 'video' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setIsCameraPaused(!isCameraPaused)}
                                                                className={cn("w-14 h-14 rounded-full transition-all", isCameraPaused ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}
                                                            >
                                                                {isCameraPaused ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                                            </Button>
                                                        )}

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setIsMuted(!isMuted)}
                                                            className={cn("w-14 h-14 rounded-full transition-all", isMuted ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}
                                                        >
                                                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setIsInviteModalOpen(true)}
                                                            className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20"
                                                        >
                                                            <UserPlus className="w-5 h-5" />
                                                        </Button>
                                                    </div>

                                                    <Button
                                                        onClick={endCall}
                                                        className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-[0_0_30px_rgba(var(--danger-rgb),0.4)] transition-all hover:scale-110 active:scale-90"
                                                    >
                                                        <PhoneOff className="w-10 h-10" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Invite Friends Modal */}
                                    <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                                        <DialogContent className={cn("border max-w-sm rounded-2xl p-0 overflow-hidden shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 border-b transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                <DialogTitle>Invite Friends</DialogTitle>
                                                <DialogDescription className={isDarkMode ? "text-white/40" : "text-neutral-500"}>
                                                    Invite your friends to joining this call.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                                                {friendsList.filter(f => !f.isGroup && f.id !== selectedFriendId).map(friend => (
                                                    <div key={friend.id} className={cn("flex items-center gap-4 p-3 rounded-xl transition-colors", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}>
                                                        <Avatar className="w-10 h-10 ring-2 ring-primary/10">
                                                            <AvatarImage src={friend.image} />
                                                            <AvatarFallback className={cn(isDarkMode ? "bg-white/5 text-white/40" : "bg-neutral-100 text-neutral-500")}>{friend.name[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-grow">
                                                            <p className={cn("font-medium text-sm transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{friend.name}</p>
                                                            <p className={cn("text-[10px] transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{friend.status === 'online' ? 'Online' : 'Offline'}</p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleInviteFriend(friend)}
                                                            className={cn("text-xs font-bold rounded-lg transition-colors h-8 px-4", isDarkMode ? "text-accent hover:bg-accent/10" : "text-sky-600 hover:bg-sky-50")}
                                                        >
                                                            Invite
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <DialogFooter className={cn("p-4 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setIsInviteModalOpen(false)}
                                                    className={cn("w-full transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-800")}
                                                >
                                                    Done
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Forward Modal */}
                                    <Dialog open={!!isForwarding} onOpenChange={() => setIsForwarding(null)}>
                                        <DialogContent className={cn("border max-w-sm rounded-2xl p-0 overflow-hidden shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 border-b transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                <DialogTitle>Forward Message</DialogTitle>
                                            </DialogHeader>
                                            <div className="max-h-[400px] overflow-y-auto p-2">
                                                {friendsList.filter(u => (u.isFriend || u.isGroup) && !u.isExited && !u.isBlocked).map(friend => (
                                                    <div key={friend.id} className={cn("flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")} onClick={() => {
                                                        const exists = forwardTargets.includes(friend.id)
                                                        setForwardTargets(exists ? forwardTargets.filter(id => id !== friend.id) : [...forwardTargets, friend.id])
                                                    }}>
                                                        <Checkbox
                                                            checked={forwardTargets.includes(friend.id)}
                                                            onCheckedChange={() => { }}
                                                            className={cn(
                                                                "transition-colors border-2",
                                                                isDarkMode
                                                                    ? "border-white/30 data-[state=checked]:bg-accent data-[state=checked]:text-black data-[state=checked]:border-accent"
                                                                    : "border-black/30 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white data-[state=checked]:border-sky-500"
                                                            )}
                                                        />
                                                        <Avatar className="w-10 h-10">
                                                            <AvatarImage src={friend.image} />
                                                            <AvatarFallback className={cn(isDarkMode ? "bg-white/5 text-white/40" : "bg-neutral-100 text-neutral-500")}>{friend.name[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span className={cn("font-medium transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{friend.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <DialogFooter className={cn("p-4 flex gap-2 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                                <Button variant="ghost" onClick={() => setIsForwarding(null)} className={cn("flex-grow transition-colors", isDarkMode ? "text-white/60 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200")}>Cancel</Button>
                                                <Button onClick={handleForward} disabled={forwardTargets.length === 0} className="flex-grow bg-accent hover:bg-accent/80 text-white glow">
                                                    Forward ({forwardTargets.length})
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Delete Confirmation */}
                                    <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                                        <AlertDialogContent className={cn("border rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Delete Message?</AlertDialogTitle>
                                                <AlertDialogDescription className={cn("transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>
                                                    {deleteConfirm?.type === 'everyone'
                                                        ? "This will delete the message for everyone in this chat. This action cannot be undone."
                                                        : "This will remove the message from your device only. Others will still see it."}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className={cn("border-none transition-all", isDarkMode ? "bg-white/5 text-white/60 hover:text-white hover:bg-white/10" : "bg-neutral-100 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200")}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => {
                                                        if (deleteConfirm?.type === 'everyone') deleteForEveryone(deleteConfirm.id)
                                                        else deleteForMe(deleteConfirm.id)
                                                        setDeleteConfirm(null)
                                                    }}
                                                    className="bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    {/* Bulk Delete Confirmation */}
                                    <AlertDialog open={!!bulkDeleteConfirm} onOpenChange={() => setBulkDeleteConfirm(null)}>
                                        <AlertDialogContent className={cn("border rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Delete {selectedMessageIds.length} Message(s)?</AlertDialogTitle>
                                                <AlertDialogDescription className={cn("transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>
                                                    {bulkDeleteConfirm?.type === 'everyone'
                                                        ? `This will delete ${selectedMessageIds.length} message(s) for everyone in this chat. This action cannot be undone.`
                                                        : `This will remove ${selectedMessageIds.length} message(s) from your device only. Others will still see them.`}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className={cn("border-none transition-all", isDarkMode ? "bg-white/5 text-white/60 hover:text-white hover:bg-white/10" : "bg-neutral-100 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200")} onClick={() => setBulkDeleteConfirm(null)}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => {
                                                        if (bulkDeleteConfirm?.type) handleBulkDelete(bulkDeleteConfirm.type)
                                                    }}
                                                    className="bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    {/* Centered Bulk Delete Modal for Messages */}
                                    <Dialog open={showBulkMessageDeleteModal} onOpenChange={setShowBulkMessageDeleteModal}>
                                        <DialogContent className={cn("border max-w-sm rounded-2xl p-6 shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className="mb-4">
                                                <DialogTitle className={cn("text-center text-xl transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Delete {selectedMessageIds.length} Messages?</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex flex-col gap-3">
                                                <Button
                                                    onClick={() => {
                                                        setBulkDeleteConfirm({ type: 'me' });
                                                        setShowBulkMessageDeleteModal(false);
                                                    }}
                                                    className={cn("w-full border-none h-12 rounded-xl text-base transition-all", isDarkMode ? "bg-white/5 hover:bg-white/10 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800")}
                                                >
                                                    Delete for Me
                                                </Button>
                                                {selectedFriendId && (messages[selectedFriendId] || []).filter(m => selectedMessageIds.includes(m.id)).every(m => m.sender === 'me') && (
                                                    <Button
                                                        onClick={() => {
                                                            setBulkDeleteConfirm({ type: 'everyone' });
                                                            setShowBulkMessageDeleteModal(false);
                                                        }}
                                                        className="w-full bg-red-500 hover:bg-red-600 text-white border-none h-12 rounded-xl text-base font-bold shadow-lg shadow-red-500/20"
                                                    >
                                                        Delete for Everyone
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setShowBulkMessageDeleteModal(false)}
                                                    className={cn("w-full transition-colors", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100")}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>



                                    {/* Message Info Modal (WhatsApp Style) */}
                                    <Dialog open={!!messageInfo} onOpenChange={() => setMessageInfo(null)}>
                                        <DialogContent className={cn("border max-w-sm rounded-2xl p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 border-b flex flex-row items-center gap-4 transition-colors", isDarkMode ? "border-line bg-white/5" : "border-black/5 bg-neutral-50")}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setMessageInfo(null)}
                                                    className={cn("rounded-full h-10 w-10 transition-all", isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-neutral-400 hover:text-neutral-800 hover:bg-black/5")}
                                                >
                                                    <ArrowLeft className="w-5 h-5" />
                                                </Button>
                                                <DialogTitle className={cn("text-xl font-bold transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Message info</DialogTitle>
                                            </DialogHeader>

                                            <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar" data-lenis-prevent>
                                                {/* Message Preview in Info */}
                                                <div className={cn("p-4 rounded-xl border opacity-80 scale-95 origin-top transition-colors", isDarkMode ? "bg-white/5 border-line text-white" : "bg-neutral-50 border-black/5 text-neutral-800 shadow-sm")}>
                                                    <p className={cn("text-[10px] italic mb-2 font-medium uppercase tracking-widest transition-colors", isDarkMode ? "opacity-60" : "text-neutral-500")}>Message Preview</p>
                                                    <p className="text-sm line-clamp-3 leading-relaxed">
                                                        {messageInfo?.text || (messageInfo?.type === 'image' ? 'Image' : messageInfo?.type === 'video' ? 'Video' : 'Media file')}
                                                    </p>
                                                </div>

                                                {/* Status Timeline Section */}
                                                <div className={cn("space-y-8 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5", isDarkMode ? "before:bg-white/5" : "before:bg-black/5")}>
                                                    {/* Played/Opened (Conditional - Top of stack in WHatsApp) */}
                                                    {(messageInfo?.type === 'voice' || messageInfo?.type === 'video' || messageInfo?.type === 'file') && (
                                                        <div className="flex items-start gap-6 relative group animate-in slide-in-from-left duration-500">
                                                            <div className={cn("w-10 h-10 border rounded-full flex items-center justify-center text-accent z-10 transition-all", isDarkMode ? "bg-accent/20 border-accent/30 shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]" : "bg-sky-50 border-sky-200 shadow-sm")}>
                                                                {messageInfo?.type === 'file' ? <FileText className="w-5 h-5" /> : <Play className="w-5 h-5 fill-accent/20" />}
                                                            </div>
                                                            <div className="flex-grow pt-1">
                                                                <p className={cn("font-bold text-base transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>{messageInfo?.type === 'file' ? 'Opened' : 'Played'}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <p className={cn("text-xs uppercase tracking-wider transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{messageInfo?.time || "Today"}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Seen */}
                                                    <div className="flex items-start gap-6 relative group">
                                                        <div className={cn("w-10 h-10 border rounded-full flex items-center justify-center text-accent z-10 transition-all", isDarkMode ? "bg-accent/20 border-accent/30 shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]" : "bg-sky-50 border-sky-200 shadow-sm")}>
                                                            <CheckCheck className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-grow pt-1">
                                                            <p className={cn("font-bold text-base transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Seen</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className={cn("text-xs uppercase tracking-wider transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{messageInfo?.time || "Today"}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Delivered */}
                                                    <div className="flex items-start gap-6 relative group">
                                                        <div className={cn("w-10 h-10 border rounded-full flex items-center justify-center z-10 transition-all", isDarkMode ? "bg-white/5 border-line text-white/40 group-hover:border-white/20" : "bg-neutral-100 border-black/5 text-neutral-400 group-hover:bg-neutral-200")}>
                                                            <Check className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-grow pt-1">
                                                            <p className={cn("font-bold text-base transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Delivered</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className={cn("text-xs uppercase tracking-wider transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{messageInfo?.time || "Today"}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Group Info Drawer */}
                                    <Sheet open={showGroupInfo} onOpenChange={setShowGroupInfo}>
                                        <SheetContent side="right" className={cn("border-l w-full sm:max-w-[420px] p-0 overflow-hidden flex flex-col min-h-0 shadow-2xl animate-in slide-in-from-right duration-300 transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <SheetHeader className={cn("p-4 border-b flex flex-row items-center gap-4 space-y-0 transition-colors", isDarkMode ? "border-line bg-white/5" : "border-black/5 bg-neutral-50")}>
                                                <Button variant="ghost" size="icon" onClick={() => setShowGroupInfo(false)} className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/60 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200")}>
                                                    <X className="w-5 h-5" />
                                                </Button>
                                                <SheetTitle className={cn("font-bold", isDarkMode ? "text-white" : "text-neutral-900")}>{selectedFriend?.isGroup ? "Group info" : "Contact info"}</SheetTitle>
                                            </SheetHeader>

                                            {selectedFriend && (
                                                <div className="flex-grow overflow-y-auto custom-scrollbar" data-lenis-prevent>
                                                    {/* Profile Section */}
                                                    <div className={cn("flex flex-col items-center py-8 border-b transition-colors", isDarkMode ? "bg-gradient-to-b from-white/5 to-transparent border-line" : "bg-gradient-to-b from-neutral-50 to-transparent border-black/5")}>
                                                        <div className="relative group mb-4">
                                                            <Avatar className={cn("w-32 h-32 border-4 shadow-2xl ring-2", isDarkMode ? "border-line ring-accent/20" : "border-white ring-accent/10")}>
                                                                <AvatarImage src={selectedFriend.image} />
                                                                <AvatarFallback className={cn("text-4xl", isDarkMode ? "bg-white/5" : "bg-neutral-100")}>
                                                                    {selectedFriend.isGroup ? <Users className={cn("w-16 h-16", isDarkMode ? "text-white/20" : "text-neutral-300")} /> : selectedFriend.name[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            {selectedFriend.isGroup && !selectedFriend.isExited && (

                                                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 cursor-pointer">

                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 text-white hover:text-accent rounded-full bg-white/10 hover:bg-white/20"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const isAdmin = selectedFriend.adminIds?.includes(12345);
                                                                            if (!isAdmin && selectedFriend.groupSettings?.onlyAdminsCanEditInfo) {
                                                                                toast({ title: "Restricted", description: "Only admins can edit group info.", variant: "destructive" });
                                                                                return;
                                                                            }
                                                                            openCamera('group_update');
                                                                        }}
                                                                    >
                                                                        <Camera className="w-5 h-5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 text-white hover:text-accent rounded-full bg-white/10 hover:bg-white/20"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const isAdmin = selectedFriend.adminIds?.includes(12345);
                                                                            if (!isAdmin && selectedFriend.groupSettings?.onlyAdminsCanEditInfo) {
                                                                                toast({ title: "Restricted", description: "Only admins can edit group info.", variant: "destructive" });
                                                                                return;
                                                                            }
                                                                            const input = document.createElement('input');
                                                                            input.type = 'file';
                                                                            input.accept = 'image/*';
                                                                            input.onchange = (e: any) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) {
                                                                                    const url = URL.createObjectURL(file);
                                                                                    handleUpdateGroupImage(selectedFriend.id, url);
                                                                                }
                                                                            };
                                                                            input.click();
                                                                        }}
                                                                    >
                                                                        <ImageIcon className="w-5 h-5" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 mb-1 px-4">
                                                            {isEditingGroupName ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        value={tempGroupName}
                                                                        onChange={(e) => setTempGroupName(e.target.value)}
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateGroupName()}
                                                                        onBlur={handleUpdateGroupName}
                                                                        autoFocus
                                                                        className={cn("h-9 border-accent font-bold text-xl text-center", isDarkMode ? "bg-white/5 text-white" : "bg-neutral-50 text-neutral-800")}
                                                                    />
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-accent" onClick={handleUpdateGroupName}>
                                                                        <Check className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <h2 className={cn("text-2xl font-bold tracking-tight truncate max-w-[280px]", isDarkMode ? "text-white" : "text-neutral-900")}>{selectedFriend.name}</h2>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={cn("h-8 w-8 rounded-full shrink-0 transition-colors", isDarkMode ? "text-white/20 hover:text-accent hover:bg-white/5" : "text-neutral-400 hover:text-accent hover:bg-neutral-100")}
                                                                        onClick={() => {
                                                                            const isAdmin = selectedFriend.adminIds?.includes(12345);
                                                                            const canEdit = !selectedFriend.groupSettings?.onlyAdminsCanEditInfo || isAdmin;

                                                                            if (canEdit) {
                                                                                setTempGroupName(selectedFriend.name)
                                                                                setIsEditingGroupName(true)
                                                                            } else {
                                                                                toast({ title: "Restricted", description: "Only admins can edit group info.", variant: "destructive" })
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                        <p className={cn("text-sm", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                            {selectedFriend.isGroup ? `Group · ${selectedFriend.memberIds?.length || 0} members` : selectedFriend.email}
                                                        </p>


                                                        {/* Action Buttons */}
                                                        <div className="flex gap-4 mt-8">
                                                            {selectedFriend.isGroup ? (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "flex-col h-auto py-3 px-8 rounded-2xl gap-2 w-[120px] transition-all",
                                                                            isDarkMode ? "border-line bg-white/5 hover:bg-white/10 text-white" : "border-black/5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800",
                                                                            isSearchActive && "bg-accent/10 border-accent/20"
                                                                        )}
                                                                        onClick={() => {
                                                                            const isAdmin = selectedFriend.adminIds?.includes(12345);
                                                                            const canAdd = !selectedFriend.groupSettings?.onlyAdminsCanAddMembers || isAdmin;

                                                                            if (canAdd) {
                                                                                setIsAddingMemberModalOpen(true)
                                                                            } else {
                                                                                toast({ title: "Restricted", description: "Only admins can add members.", variant: "destructive" })
                                                                            }
                                                                        }}
                                                                        disabled={selectedFriend.isExited}
                                                                    >
                                                                        <UserPlus className="w-5 h-5 text-accent" />
                                                                        <span className="text-xs font-bold">Add</span>
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "flex-col h-auto py-3 px-8 rounded-2xl gap-2 w-[120px] transition-all",
                                                                            isDarkMode ? "border-line bg-white/5 hover:bg-white/10 text-white" : "border-black/5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800",
                                                                            isSearchActive && "bg-accent/10 border-accent/20"
                                                                        )}
                                                                        onClick={() => setIsSearchActive(!isSearchActive)}
                                                                    >
                                                                        <Search className="w-5 h-5 text-accent" />
                                                                        <span className="text-xs font-bold">Search</span>
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <div className="flex justify-between w-full max-w-[320px] gap-2 px-4">
                                                                    <div className="flex flex-col items-center gap-2 flex-1 group cursor-pointer" onClick={() => startCall('video')}>
                                                                        <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center text-accent transition-all shadow-lg active:scale-95", isDarkMode ? "bg-white/5 border-line group-hover:bg-accent/10" : "bg-neutral-50 border-black/5 group-hover:bg-accent group-hover:text-white")}>
                                                                            <Video className="w-5 h-5" />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent group-hover:text-accent/80 transition-colors">Video</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-center gap-2 flex-1 group cursor-pointer" onClick={() => startCall('audio')}>
                                                                        <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center text-accent transition-all shadow-lg active:scale-95", isDarkMode ? "bg-white/5 border-line group-hover:bg-accent/10" : "bg-neutral-50 border-black/5 group-hover:bg-accent group-hover:text-white")}>
                                                                            <Phone className="w-5 h-5" />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent group-hover:text-accent/80 transition-colors">Voice</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-center gap-2 flex-1 group cursor-pointer" onClick={() => setIsSearchActive(!isSearchActive)}>
                                                                        <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center text-accent transition-all shadow-lg active:scale-95", isDarkMode ? "bg-white/5 border-line group-hover:bg-accent/10" : "bg-neutral-50 border-black/5 group-hover:bg-accent group-hover:text-white")}>
                                                                            <Search className="w-5 h-5" />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent group-hover:text-accent/80 transition-colors">Search</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Description/About Section */}

                                                    <div className={cn("p-6 border-b space-y-3 transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                        <div className="flex items-center justify-between">
                                                            <h3 className={cn("font-bold text-sm uppercase tracking-wider opacity-60", isDarkMode ? "text-white" : "text-neutral-500")}>
                                                                {selectedFriend.isGroup ? 'Description' : 'About'}
                                                            </h3>

                                                            {selectedFriend.isGroup && !selectedFriend.isExited && (

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-white/20 hover:text-accent rounded-full"
                                                                    onClick={() => {
                                                                        const isAdmin = selectedFriend.adminIds?.includes(12345);
                                                                        const canEdit = !selectedFriend.groupSettings?.onlyAdminsCanEditInfo || isAdmin;

                                                                        if (canEdit) {
                                                                            setTempDescription(selectedFriend.description || "")
                                                                            setIsEditingDescription(true)
                                                                        } else {
                                                                            toast({ title: "Restricted", description: "Only admins can edit group info.", variant: "destructive" })
                                                                        }
                                                                    }}
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                        {isEditingDescription ? (
                                                            <div className="space-y-3">
                                                                <textarea
                                                                    value={tempDescription}
                                                                    onChange={(e) => setTempDescription(e.target.value)}
                                                                    autoFocus
                                                                    className={cn("w-full border rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:border-accent transition-all", isDarkMode ? "bg-white/5 border-line text-white" : "bg-neutral-50 border-black/10 text-neutral-800")}
                                                                    placeholder="Add group description..."
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(false)} className={cn(isDarkMode ? "text-white/40 hover:text-white" : "text-neutral-500 hover:text-neutral-800")}>Cancel</Button>
                                                                    <Button size="sm" className="bg-accent text-canvas" onClick={handleUpdateGroupDescription}>Save</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className={cn("text-sm leading-relaxed italic", isDarkMode ? "text-white/80" : "text-neutral-600")}>
                                                                {selectedFriend.description || (selectedFriend.isGroup ? "No description provided." : "No about info provided.")}
                                                            </p>
                                                        )}
                                                        <p className={cn("text-[10px]", isDarkMode ? "text-white/20" : "text-neutral-400")}>
                                                            {selectedFriend.isGroup ? `Created on ${selectedFriend.createdAt || "Unknown"}` : `Account created ${selectedFriend.createdAt || "Unknown"}`}
                                                        </p>
                                                    </div>

                                                    {/* Media Section */}
                                                    <div
                                                        className={cn("p-6 border-b space-y-4 cursor-pointer transition-colors", isDarkMode ? "border-line hover:bg-white/5" : "border-black/5 hover:bg-neutral-50")}
                                                        onClick={() => {
                                                            setActiveMediaTab('media');
                                                            setIsMediaViewOpen(true);
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className={cn("font-bold", isDarkMode ? "text-white" : "text-neutral-800")}>Media, links and docs</span>
                                                            <div className={cn("flex items-center gap-1", isDarkMode ? "text-white/40" : "text-neutral-400")}>
                                                                <span>
                                                                    {(messages[selectedFriend.id] || []).filter(m =>
                                                                        m.type === 'image' || m.type === 'video' || m.type === 'file' || (m.type === 'text' && /(https?:\/\/[^\s]+)/g.test(m.text))
                                                                    ).length}
                                                                </span>
                                                                <ChevronRight className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                            {(messages[selectedFriend.id] || []).filter(m => m.type === 'image' || m.type === 'video').slice(-5).map((m, i) => (
                                                                <div key={i} className={cn("flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border transition-colors", isDarkMode ? "border-line bg-white/5" : "border-black/5 bg-neutral-100")}>
                                                                    <img src={m.mediaUrl || m.url || m.text} alt="media" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                            {(messages[selectedFriend.id] || []).filter(m => m.type === 'image' || m.type === 'video').length === 0 && (
                                                                <div className={cn("w-full py-4 text-center border-2 border-dashed rounded-2xl transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                                    <span className={cn("text-xs", isDarkMode ? "text-white/20" : "text-neutral-400")}>No media shared yet</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Groups in Common Section (For Contacts) - Only show if there are common groups */}
                                                    {!selectedFriend.isGroup && groupsInCommon.length > 0 && (
                                                        <div className={cn("p-6 border-b space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                            <h3 className={cn("font-bold text-sm uppercase tracking-wider opacity-60", isDarkMode ? "text-white" : "text-neutral-500")}>Groups in Common</h3>
                                                            <div className="space-y-3">
                                                                {groupsInCommon.map(group => (
                                                                    <div key={group.id} className={cn("flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group", isDarkMode ? "border-line bg-white/5 hover:bg-white/10" : "border-black/5 bg-neutral-50 hover:bg-neutral-100")}>
                                                                        <Avatar className={cn("w-10 h-10 border transition-transform group-hover:scale-105", isDarkMode ? "border-line" : "border-white")}>
                                                                            <AvatarImage src={group.image} />
                                                                            <AvatarFallback className={isDarkMode ? "bg-white/5" : "bg-neutral-100"}>
                                                                                <Users className={cn("w-5 h-5", isDarkMode ? "text-white/20" : "text-neutral-300")} />
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex-grow min-w-0">
                                                                            <p className={cn("font-bold text-sm truncate", isDarkMode ? "text-white" : "text-neutral-800")}>{group.name}</p>
                                                                            <p className={cn("text-[10px] truncate", isDarkMode ? "text-white/40" : "text-neutral-500")}>{group.memberIds?.length || 0} members</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Group Settings Section (Reordered) */}
                                                    {selectedFriend.adminIds?.includes(12345) && (
                                                        <div className={cn("p-6 border-b space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                            <div
                                                                className={cn("flex items-center gap-4 py-3 cursor-pointer rounded-2xl px-3 -mx-3 transition-all group", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}
                                                                onClick={() => setIsGroupSettingsOpen(true)}
                                                            >
                                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                                                    <Settings className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-grow">
                                                                    <p className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-neutral-800")}>Group settings</p>
                                                                    <p className={cn("text-[10px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>Manage permissions and security</p>
                                                                </div>
                                                                <ChevronRight className={cn("w-4 h-4 transition-colors", isDarkMode ? "text-white/20 group-hover:text-white" : "text-neutral-300 group-hover:text-neutral-600")} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Participants Section - Only for Groups */}
                                                    {selectedFriend.isGroup && (
                                                        <div className="p-6 space-y-6 pb-20">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className={cn("text-sm font-bold", isDarkMode ? "text-white/60" : "text-neutral-500")}>{selectedFriend.memberIds?.length || 0} members</h3>
                                                                {isSearchActive && (
                                                                    <div className="relative flex-grow ml-4 animate-in slide-in-from-right-4 duration-300">
                                                                        <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Search members..."
                                                                            autoFocus
                                                                            className={cn("w-full transition-all text-xs rounded-full pl-9 pr-3 py-1.5 focus:outline-none focus:border-accent", isDarkMode ? "bg-white/5 border-line text-white placeholder:text-white/40" : "bg-neutral-100 border-black/5 text-neutral-800 placeholder:text-neutral-400")}
                                                                            value={memberSearchQuery}
                                                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="space-y-4">
                                                                {/* Add Member Row */}
                                                                {!selectedFriend.isExited && (
                                                                    <div
                                                                        className="flex items-center gap-4 cursor-pointer group"
                                                                        onClick={() => {
                                                                            const isAdmin = selectedFriend.adminIds?.includes(12345);
                                                                            const canAdd = !selectedFriend.groupSettings?.onlyAdminsCanAddMembers || isAdmin;

                                                                            if (canAdd) {
                                                                                setIsAddingMemberModalOpen(true)
                                                                            } else {
                                                                                toast({ title: "Restricted", description: "Only admins can add members.", variant: "destructive" })
                                                                            }
                                                                        }}
                                                                    >
                                                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", isDarkMode ? "bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100")}>
                                                                            <UserPlus className="w-5 h-5" />
                                                                        </div>
                                                                        <span className={cn("font-medium text-sm transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>Add member</span>
                                                                    </div>
                                                                )}

                                                                {/* Members List */}
                                                                {selectedFriend.memberIds?.filter((id: number) => {
                                                                    const member = id === 12345 ? { name: "You" } : friendsList.find(f => f.id === id);
                                                                    return (member?.name || "").toLowerCase().includes(memberSearchQuery.toLowerCase());
                                                                }).map((memberId: number) => {
                                                                    const member = memberId === 12345 ? { name: "You", bio: "Available", image: "", id: 12345 } : friendsList.find(f => f.id === memberId);
                                                                    if (!member) return null;
                                                                    const isAdmin = selectedFriend.adminIds?.includes(member.id);

                                                                    return (
                                                                        <div key={member.id} className="flex items-center gap-4">
                                                                            <Avatar className={cn("w-10 h-10 border transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                                                <AvatarImage src={member.image} />
                                                                                <AvatarFallback className={cn("transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-100")}>{member.name[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex-grow min-w-0">
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <span className={cn("font-bold text-sm truncate transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{member.name}</span>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {isAdmin && (
                                                                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap">Group admin</span>
                                                                                        )}
                                                                                        {selectedFriend.adminIds?.includes(12345) && member.id !== 12345 && (
                                                                                            <DropdownMenu>
                                                                                                <DropdownMenuTrigger asChild>
                                                                                                    <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full transition-colors", isDarkMode ? "text-white/20 hover:text-white" : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100")}>
                                                                                                        <MoreHorizontal className="w-4 h-4" />
                                                                                                    </Button>
                                                                                                </DropdownMenuTrigger>
                                                                                                <DropdownMenuContent className={cn("border min-w-[150px]", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")} align="end">
                                                                                                    {!isAdmin && (
                                                                                                        <DropdownMenuItem
                                                                                                            className={cn("cursor-pointer", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                                                            onClick={() => handlePromoteToAdmin(selectedFriend.id, member.id)}
                                                                                                        >
                                                                                                            <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" /> Make admin
                                                                                                        </DropdownMenuItem>
                                                                                                    )}
                                                                                                    {isAdmin && member.id !== selectedFriend.creatorId && (
                                                                                                        <DropdownMenuItem
                                                                                                            className={cn("cursor-pointer", isDarkMode ? "focus:bg-white/5" : "focus:bg-neutral-100")}
                                                                                                            onClick={() => handleDemoteAdmin(selectedFriend.id, member.id)}
                                                                                                        >
                                                                                                            <ShieldCheck className="w-4 h-4 mr-2 text-red-500" /> Dismiss as admin
                                                                                                        </DropdownMenuItem>
                                                                                                    )}
                                                                                                    {member.id !== selectedFriend.creatorId && (
                                                                                                        <DropdownMenuItem
                                                                                                            className={cn("text-red-500 focus:text-red-500 cursor-pointer", isDarkMode ? "focus:bg-red-400/10" : "focus:bg-red-50")}
                                                                                                            onClick={() => handleRemoveMember(selectedFriend.id, member.id)}
                                                                                                        >
                                                                                                            <UserMinus className="w-4 h-4 mr-2" /> Remove from group
                                                                                                        </DropdownMenuItem>
                                                                                                    )}
                                                                                                    {member.id === selectedFriend.creatorId && (
                                                                                                        <DropdownMenuItem className={cn("cursor-default opacity-50", isDarkMode ? "text-white/20" : "text-neutral-400")} disabled>
                                                                                                            <ShieldCheck className="w-4 h-4 mr-2" /> Group Creator
                                                                                                        </DropdownMenuItem>
                                                                                                    )}
                                                                                                </DropdownMenuContent>
                                                                                            </DropdownMenu>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <p className={cn("text-xs truncate transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{member.bio || "Available"}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className={cn("space-y-4 pt-6 mt-6 border-t transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                                <div
                                                                    className={cn(
                                                                        "flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors",
                                                                        selectedFriend.isFavourite ? "text-accent" : (isDarkMode ? "text-white/80 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100")
                                                                    )}
                                                                    onClick={() => handleToggleFavoriteGroup(selectedFriend.id)}
                                                                >
                                                                    <Heart className={cn("w-5 h-5 transition-colors", selectedFriend.isFavourite ? "fill-accent" : (isDarkMode ? "text-white/40" : "text-neutral-400"))} />
                                                                    <span className="font-medium text-sm">{selectedFriend.isFavourite ? "In Favorites" : "Add to Favorites"}</span>
                                                                </div>
                                                                <div
                                                                    className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors", isDarkMode ? "text-white/80 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100")}
                                                                    onClick={() => setClearChatConfirm(selectedFriend.id)}
                                                                >
                                                                    <Trash className={cn("w-5 h-5 transition-colors", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                                    <span className="text-sm font-medium">Clear chat</span>
                                                                </div>
                                                                <div
                                                                    className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors text-red-500", isDarkMode ? "hover:bg-red-500/5" : "hover:bg-red-50")}
                                                                    onClick={() => setGroupToExit(selectedFriend.id)}
                                                                >
                                                                    <LogOut className="w-5 h-5" />
                                                                    <span className="text-sm font-medium">Exit group</span>
                                                                </div>
                                                                <div
                                                                    className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors text-red-500", isDarkMode ? "hover:bg-red-500/5" : "hover:bg-red-50")}
                                                                    onClick={() => handleReportGroup(selectedFriend.name)}
                                                                >
                                                                    <AlertCircle className="w-5 h-5" />
                                                                    <span className="text-sm font-medium">Report group</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Bottom Actions - Single Chat */}
                                                    {!selectedFriend.isGroup && (
                                                        <div className="p-6 space-y-4 pb-20">
                                                            <div
                                                                className={cn(
                                                                    "flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors",
                                                                    selectedFriend.isFavourite ? "text-accent" : (isDarkMode ? "text-white/80 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100")
                                                                )}
                                                                onClick={() => toggleFavouriteFriend(selectedFriend.id)}
                                                            >
                                                                <Heart className={cn("w-5 h-5 transition-colors", selectedFriend.isFavourite ? "fill-accent" : (isDarkMode ? "text-white/40" : "text-neutral-400"))} />
                                                                <span className="font-medium text-sm transition-colors">{selectedFriend.isFavourite ? "Remove from favourites" : "Add to favourites"}</span>
                                                            </div>
                                                            {selectedFriend.isBlocked ? (
                                                                <div
                                                                    className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors", isDarkMode ? "text-white/80 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100")}
                                                                    onClick={() => {
                                                                        setFriendsList(prev => prev.map(f => f.id === selectedFriend.id ? { ...f, isBlocked: false } : f))
                                                                        toast({ title: "Unblocked", description: `${selectedFriend.name} has been unblocked.` })
                                                                    }}
                                                                >
                                                                    <Ban className={cn("w-5 h-5 transition-colors", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                                    <span className="font-medium text-sm">Unblock {selectedFriend.name}</span>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors", isDarkMode ? "text-white/80 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100")}
                                                                    onClick={() => {
                                                                        setShowGroupInfo(false);
                                                                        confirmBlockUser(selectedFriend);
                                                                    }}
                                                                >
                                                                    <Ban className={cn("w-5 h-5 transition-colors", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                                    <span className="font-medium text-sm">Block {selectedFriend.name}</span>
                                                                </div>
                                                            )}
                                                            <div
                                                                className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors text-red-500", isDarkMode ? "hover:bg-red-500/5" : "hover:bg-red-50")}
                                                                onClick={() => {
                                                                    setShowGroupInfo(false);
                                                                    handleReportFriend(selectedFriend);
                                                                }}
                                                            >
                                                                <AlertCircle className="w-5 h-5" />
                                                                <span className="text-sm font-medium">Report {selectedFriend.name}</span>
                                                            </div>
                                                            <div
                                                                className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors", isDarkMode ? "text-white/80 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100")}
                                                                onClick={() => {
                                                                    setShowGroupInfo(false);
                                                                    setClearChatConfirm(selectedFriend.id);
                                                                }}
                                                            >
                                                                <Trash className={cn("w-5 h-5 transition-colors", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                                <span className="text-sm font-medium">Clear chat</span>
                                                            </div>
                                                            <div
                                                                className={cn("flex items-center gap-4 py-2 cursor-pointer rounded-xl px-2 -mx-2 transition-colors text-red-500", isDarkMode ? "hover:bg-red-500/5" : "hover:bg-red-50")}
                                                                onClick={() => {
                                                                    setShowGroupInfo(false);
                                                                    confirmDeleteChat(selectedFriend);
                                                                }}
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                                <span className="text-sm font-medium">Delete chat</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </SheetContent>
                                    </Sheet>

                                    <Sheet open={isStarredViewOpen} onOpenChange={setIsStarredViewOpen}>
                                        <SheetContent side="right" className={cn("border-l w-full sm:max-w-md p-0 overflow-hidden flex flex-col shadow-2xl transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <SheetHeader className={cn("p-6 border-b flex flex-row items-center gap-4 transition-colors", isDarkMode ? "border-line bg-white/5" : "border-black/5 bg-neutral-50")}>
                                                <Button variant="ghost" size="icon" onClick={() => setIsStarredViewOpen(false)} className={cn("rounded-full h-10 w-10 transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>
                                                    <X className="w-5 h-5" />
                                                </Button>
                                                <SheetTitle className={cn("font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-neutral-900")}>
                                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                                    Starred Messages
                                                </SheetTitle>
                                            </SheetHeader>
                                            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                                {selectedFriend && messages[selectedFriend.id]?.filter(m => m.isStarred).length === 0 && (
                                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", isDarkMode ? "bg-white/5" : "bg-neutral-100")}>
                                                            <Star className={cn("w-8 h-8", isDarkMode ? "text-white/20" : "text-neutral-300")} />
                                                        </div>
                                                        <p className={cn("text-sm", isDarkMode ? "text-white/40" : "text-neutral-500")}>No starred messages in this chat.</p>
                                                    </div>
                                                )}
                                                {selectedFriend && messages[selectedFriend.id]?.filter(m => m.isStarred).map(msg => (
                                                    <div key={msg.id} className={cn("rounded-xl p-4 border transition-all cursor-pointer", isDarkMode ? "bg-white/5 border-line hover:bg-white/10" : "bg-neutral-50 border-black/5 hover:bg-neutral-100 hover:shadow-md")} onClick={() => {
                                                        scrollToMessage(msg.id)
                                                        setIsStarredViewOpen(false)
                                                    }}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs font-bold text-accent">{msg.sender === 'me' ? "You" : selectedFriend.name}</span>
                                                            <span className={cn("text-[10px]", isDarkMode ? "text-white/40" : "text-neutral-500")}>{msg.time}</span>
                                                        </div>
                                                        <p className={cn("text-sm line-clamp-3", isDarkMode ? "text-white/80" : "text-neutral-700")}>{msg.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                    <Sheet open={isMediaViewOpen} onOpenChange={setIsMediaViewOpen}>
                                        <SheetContent side="right" className={cn("border-l w-full sm:max-w-md p-0 overflow-hidden flex flex-col shadow-2xl transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <SheetHeader className={cn("p-0 border-b shrink-0 transition-colors", isDarkMode ? "border-line bg-white/5" : "border-black/5 bg-neutral-50")}>
                                                <div className="p-6 flex items-center justify-between">
                                                    <SheetTitle className={cn("flex items-center gap-2 font-bold", isDarkMode ? "text-white" : "text-neutral-900")}>
                                                        <ImageIcon className="w-5 h-5 text-accent" />
                                                        Media, links and docs
                                                    </SheetTitle>
                                                    <Button variant="ghost" size="icon" onClick={() => setIsMediaViewOpen(false)} className={cn("h-8 w-8 rounded-full transition-colors", isDarkMode ? "text-white/40 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>
                                                        <X className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                                <div className="flex px-2 pb-0">
                                                    {['media', 'docs', 'links'].map((tab) => {
                                                        const count = selectedFriend ? (messages[selectedFriend.id] || []).filter(m => {
                                                            if (tab === 'media') return m.type === 'image' || m.type === 'video';
                                                            if (tab === 'docs') return m.type === 'file';
                                                            if (tab === 'links') return m.type === 'text' && /(https?:\/\/[^\s]+)/g.test(m.text);
                                                            return false;
                                                        }).length : 0;

                                                        return (
                                                            <button
                                                                key={tab}
                                                                onClick={() => setActiveMediaTab(tab as any)}
                                                                className={cn(
                                                                    "flex-1 py-3 text-sm font-bold transition-all border-b-2 relative flex items-center justify-center gap-2",
                                                                    activeMediaTab === tab
                                                                        ? (isDarkMode ? "text-accent border-accent bg-accent/5" : "text-sky-600 border-sky-600 bg-sky-50/50")
                                                                        : (isDarkMode ? "text-white/40 border-transparent hover:text-white/60" : "text-neutral-400 border-transparent hover:text-neutral-600")
                                                                )}
                                                            >
                                                                <span className="capitalize">{tab}</span>
                                                                <span className={cn(
                                                                    "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                                                                    activeMediaTab === tab
                                                                        ? (isDarkMode ? "bg-accent/20 text-accent" : "bg-sky-100 text-sky-700")
                                                                        : (isDarkMode ? "bg-white/5 text-white/40" : "bg-neutral-100 text-neutral-500")
                                                                )}>
                                                                    {count}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </SheetHeader>

                                            <div className="flex-grow overflow-y-auto custom-scrollbar p-1">
                                                {activeMediaTab === 'media' && (
                                                    <div className="grid grid-cols-3 gap-1 p-2">
                                                        {selectedFriend && (messages[selectedFriend.id] || [])
                                                            .filter(m => m.type === 'image' || m.type === 'video')
                                                            .map((m, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className={cn("relative aspect-square group cursor-pointer overflow-hidden rounded-md transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-100")}
                                                                    onClick={() => setMediaPreview({ type: m.type, url: m.mediaUrl || m.url || m.text, name: m.fileName || 'Media' })}
                                                                >
                                                                    <img src={m.mediaUrl || m.url || m.text} alt="media" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                                    {m.type === 'video' && (
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                            <Play className="w-6 h-6 text-white fill-white" />
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            ))}
                                                        {selectedFriend && (messages[selectedFriend.id] || []).filter(m => m.type === 'image' || m.type === 'video').length === 0 && (
                                                            <div className={cn("col-span-3 py-20 text-center", isDarkMode ? "text-white/20" : "text-neutral-400")}>
                                                                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                                <p>No media found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {activeMediaTab === 'docs' && (
                                                    <div className="p-4 space-y-2">
                                                        {selectedFriend && (messages[selectedFriend.id] || [])
                                                            .filter(m => m.type === 'file')
                                                            .map((m, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={cn("flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer", isDarkMode ? "bg-white/5 border-line hover:bg-white/10" : "bg-neutral-50 border-black/5 hover:bg-neutral-100 hover:shadow-md")}
                                                                    onClick={() => setMediaPreview({ type: 'file', url: m.mediaUrl || m.url, name: m.fileName || 'Document' })}
                                                                >
                                                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isDarkMode ? "bg-accent/20 text-accent" : "bg-sky-100 text-sky-600")}>
                                                                        <FileText className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={cn("text-sm font-bold truncate transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{m.fileName || 'Document'}</p>
                                                                        <p className={cn("text-[10px] transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{m.time} • {m.fileSize || 'Unknown size'}</p>
                                                                    </div>
                                                                    <Download className={cn("w-4 h-4 transition-colors", isDarkMode ? "text-white/20" : "text-neutral-400")} />
                                                                </div>
                                                            ))}
                                                        {selectedFriend && (messages[selectedFriend.id] || []).filter(m => m.type === 'file').length === 0 && (
                                                            <div className={cn("py-20 text-center", isDarkMode ? "text-white/20" : "text-neutral-400")}>
                                                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                                <p>No documents found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {activeMediaTab === 'links' && (
                                                    <div className="p-4 space-y-4">
                                                        {selectedFriend && (messages[selectedFriend.id] || [])
                                                            .filter(m => m.type === 'text' && /(https?:\/\/[^\s]+)/g.test(m.text))
                                                            .map((m, i) => {
                                                                const links = m.text.match(/(https?:\/\/[^\s]+)/g);
                                                                return links?.map((link, li) => (
                                                                    <div
                                                                        key={`${i}-${li}`}
                                                                        className={cn("space-y-2 p-4 rounded-2xl border transition-all cursor-pointer group", isDarkMode ? "bg-white/5 border-line hover:bg-white/10" : "bg-neutral-50 border-black/5 hover:bg-neutral-100 hover:shadow-md")}
                                                                        onClick={() => window.open(link, '_blank')}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-sky-100 text-sky-600")}>
                                                                                <LinkIcon className="w-5 h-5" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className={cn("text-sm font-bold truncate underline transition-colors", isDarkMode ? "text-blue-400" : "text-sky-600")}>{link}</p>
                                                                                <p className={cn("text-xs line-clamp-2 mt-1 transition-colors", isDarkMode ? "text-white/60" : "text-neutral-600")}>{m.text.replace(link, '') || "Shared link"}</p>
                                                                                <p className={cn("text-[10px] mt-2 transition-colors", isDarkMode ? "text-white/20" : "text-neutral-400")}>{m.time}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ));
                                                            })}
                                                        {selectedFriend && (messages[selectedFriend.id] || []).filter(m => m.type === 'text' && /(https?:\/\/[^\s]+)/g.test(m.text)).length === 0 && (
                                                            <div className={cn("py-20 text-center", isDarkMode ? "text-white/20" : "text-neutral-400")}>
                                                                <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                                <p>No links found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                    {/* Add Member Dialog */}
                                    <Dialog open={isAddingMemberModalOpen} onOpenChange={setIsAddingMemberModalOpen}>
                                        <DialogContent className={cn("border sm:max-w-md p-0 overflow-hidden shadow-2xl transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 pb-2 border-b transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                <DialogTitle className={cn("text-xl font-bold transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Add member</DialogTitle>
                                            </DialogHeader>
                                            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                <div className="space-y-2">
                                                    {friendsList.filter(f => !f.isGroup && !selectedFriend?.memberIds?.includes(f.id)).map(friend => (
                                                        <div
                                                            key={friend.id}
                                                            className={cn(
                                                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                                                selectedGroupMembers.includes(friend.id)
                                                                    ? (isDarkMode ? "bg-accent/10 border-accent/20" : "bg-sky-50 border-sky-200")
                                                                    : (isDarkMode ? "border-transparent hover:bg-white/5" : "border-transparent hover:bg-neutral-50")
                                                            )}
                                                            onClick={() => {
                                                                setSelectedGroupMembers(prev =>
                                                                    prev.includes(friend.id) ? prev.filter(id => id !== friend.id) : [...prev, friend.id]
                                                                )
                                                            }}
                                                        >
                                                            <Avatar className={cn("w-10 h-10 border transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                                <AvatarImage src={friend.image} />
                                                                <AvatarFallback className={cn("transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-100")}>{friend.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-grow min-w-0">
                                                                <p className={cn("font-bold text-sm truncate transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{friend.name}</p>
                                                                <p className={cn("text-xs truncate transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{friend.email}</p>
                                                            </div>
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                selectedGroupMembers.includes(friend.id)
                                                                    ? "bg-accent border-accent"
                                                                    : (isDarkMode ? "border-line" : "border-black/20")
                                                            )}>
                                                                {selectedGroupMembers.includes(friend.id) && <Check className={cn("w-3 h-3 stroke-[4]", isDarkMode ? "text-canvas" : "text-white")} />}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {friendsList.filter(f => !f.isGroup && !selectedFriend?.memberIds?.includes(f.id)).length === 0 && (
                                                        <div className="text-center py-10">
                                                            <p className={cn("text-sm transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>All your friends are already in this group.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <DialogFooter className={cn("p-4 flex gap-3 sm:gap-0 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                                <Button variant="ghost" onClick={() => {
                                                    setIsAddingMemberModalOpen(false)
                                                    setSelectedGroupMembers([])
                                                }} className={cn("transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>Cancel</Button>
                                                <Button
                                                    className={cn("px-8 transition-all active:scale-95 shadow-lg", isDarkMode ? "bg-accent text-canvas hover:bg-accent/90" : "bg-sky-500 text-white hover:bg-sky-600")}
                                                    disabled={selectedGroupMembers.length === 0}
                                                    onClick={() => handleAddMemberToGroup(selectedGroupMembers)}
                                                >
                                                    Add Member
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    {/* Admin Transfer Dialog */}
                                    <Dialog open={isTransferringAdmin} onOpenChange={setIsTransferringAdmin}>
                                        <DialogContent className={cn("border sm:max-w-md p-0 overflow-hidden shadow-2xl transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 pb-2 border-b transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                <DialogTitle className={cn("text-xl font-bold transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Transfer Admin</DialogTitle>
                                                <DialogDescription className={cn("text-xs transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                    Before you leave, you must appoint a new admin for the group.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                <div className="space-y-2">
                                                    {selectedFriend.memberIds?.filter(id => id !== 12345 && !selectedFriend.adminIds?.includes(id)).map(memberId => {
                                                        const member = friendsList.find(f => f.id === memberId);
                                                        if (!member) return null;
                                                        return (
                                                            <div
                                                                key={member.id}
                                                                className={cn("flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}
                                                                onClick={() => handleTransferAdminAndExit(member.id)}
                                                            >
                                                                <Avatar className={cn("w-10 h-10 border transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                                    <AvatarImage src={member.image} />
                                                                    <AvatarFallback className={cn("transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-100")}>{member.name[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-grow min-w-0">
                                                                    <p className={cn("font-bold text-sm truncate transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{member.name}</p>
                                                                    <p className={cn("text-xs truncate transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{member.bio || "Available"}</p>
                                                                </div>
                                                                <Button size="sm" variant="outline" className={cn("text-[10px] h-7 px-3 transition-colors", isDarkMode ? "border-line hover:bg-white/10" : "border-black/10 hover:bg-neutral-100")}>Appoint</Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <DialogFooter className={cn("p-4 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                                <Button variant="ghost" onClick={() => setIsTransferringAdmin(false)} className={cn("transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>Cancel</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Report Group Dialog */}
                                    <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                                        <DialogContent className={cn("border sm:max-w-md p-0 overflow-hidden shadow-2xl transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 pb-2 border-b transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                <DialogTitle className={cn("text-xl font-bold flex items-center gap-2 transition-colors", isDarkMode ? "text-red-400" : "text-red-600")}>
                                                    <AlertCircle className="w-5 h-5" />
                                                    Report Group
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="p-6 space-y-4">
                                                <p className={cn("text-sm transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>Help us understand what's happening. Why are you reporting this group?</p>
                                                <div className="space-y-2">
                                                    {['Spam', 'Harassment', 'Inappropriate content', 'Other'].map((reason) => (
                                                        <div
                                                            key={reason}
                                                            className={cn(
                                                                "p-3 rounded-xl cursor-pointer border transition-all text-sm font-medium",
                                                                reportReason === reason
                                                                    ? (isDarkMode ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-red-50 border-red-200 text-red-700")
                                                                    : (isDarkMode ? "bg-white/5 border-line text-white/80 hover:bg-white/10" : "bg-neutral-50 border-black/5 text-neutral-700 hover:bg-neutral-100")
                                                            )}
                                                            onClick={() => setReportReason(reason)}
                                                        >
                                                            {reason}
                                                        </div>
                                                    ))}
                                                </div>
                                                {reportReason === 'Other' && (
                                                    <textarea
                                                        className={cn("w-full rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:border-red-500/50 transition-all", isDarkMode ? "bg-white/5 border-line text-white placeholder:text-white/20" : "bg-neutral-50 border-black/10 text-neutral-800 placeholder:text-neutral-400")}
                                                        placeholder="Please specify..."
                                                        onChange={(e) => setReportReason(e.target.value)}
                                                    />
                                                )}
                                            </div>
                                            <DialogFooter className={cn("p-4 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                                <Button variant="ghost" onClick={() => setIsReportModalOpen(false)} className={cn("transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>Cancel</Button>
                                                <Button
                                                    className={cn("px-8 transition-all active:scale-95 shadow-lg", isDarkMode ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/10" : "bg-red-500 text-white hover:bg-red-600")}
                                                    disabled={!reportReason}
                                                    onClick={submitReport}
                                                >
                                                    Submit Report
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Exit Group Confirmation */}
                                    <AlertDialog open={groupToExit !== null} onOpenChange={(open) => !open && setGroupToExit(null)}>
                                        <AlertDialogContent className={cn("border rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Exit "{friendsList.find(f => f.id === groupToExit)?.name}" group?</AlertDialogTitle>
                                                <AlertDialogDescription className={cn("transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>
                                                    Are you sure you want to exit this group? You will no longer be able to send or receive messages.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className={cn("transition-colors", isDarkMode ? "bg-white/5 border-line text-white hover:bg-white/10" : "bg-neutral-100 border-black/5 text-neutral-800 hover:bg-neutral-200")}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-red-500 hover:bg-red-600 text-white font-bold border-none"
                                                    onClick={() => {
                                                        if (groupToExit) {
                                                            handleExitGroup(groupToExit);
                                                            setGroupToExit(null);
                                                        }
                                                    }}
                                                >
                                                    Exit Group
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    {/* Clear Chat Confirmation */}
                                    <AlertDialog open={clearChatConfirm !== null} onOpenChange={() => setClearChatConfirm(null)}>
                                        <AlertDialogContent className={cn("border rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Clear chat messages?</AlertDialogTitle>
                                                <AlertDialogDescription className={cn("transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                    This will delete all messages in this chat. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className={cn("transition-colors", isDarkMode ? "bg-white/5 border-line text-white hover:bg-white/10" : "bg-neutral-100 border-black/5 text-neutral-800 hover:bg-neutral-200")}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-red-500 hover:bg-red-600 text-white font-bold border-none"
                                                    onClick={() => {
                                                        if (clearChatConfirm !== null) {
                                                            handleClearChat(clearChatConfirm);
                                                        }
                                                    }}
                                                >
                                                    Clear Chat
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    {/* Report Friend Dialog */}
                                    <Dialog open={!!reportFriend} onOpenChange={() => setReportFriend(null)}>
                                        <DialogContent className={cn("border sm:max-w-md p-0 overflow-hidden shadow-2xl transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 pb-2 border-b transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                <DialogTitle className={cn("text-xl font-bold flex items-center gap-2 transition-colors", isDarkMode ? "text-red-400" : "text-red-600")}>
                                                    <AlertCircle className="w-5 h-5" />
                                                    Report {reportFriend?.name || 'User'}
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="p-6 space-y-4">
                                                <p className={cn("text-sm transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>Help us understand the problem. Why are you reporting this user?</p>
                                                <div className="space-y-2">
                                                    {['Spam', 'Harassment', 'Inappropriate content', 'Fake account', 'Other'].map((reason) => (
                                                        <div
                                                            key={reason}
                                                            className={cn(
                                                                "p-3 rounded-xl cursor-pointer border transition-all text-sm font-medium",
                                                                friendReportReason === reason
                                                                    ? (isDarkMode ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-red-50 border-red-200 text-red-700")
                                                                    : (isDarkMode ? "bg-white/5 border-line text-white/80 hover:bg-white/10" : "bg-neutral-50 border-black/5 text-neutral-700 hover:bg-neutral-100")
                                                            )}
                                                            onClick={() => setFriendReportReason(reason)}
                                                        >
                                                            {reason}
                                                        </div>
                                                    ))}
                                                </div>
                                                {friendReportReason === 'Other' && (
                                                    <textarea
                                                        className={cn("w-full rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:border-red-500/50 transition-all", isDarkMode ? "bg-white/5 border-line text-white placeholder:text-white/20" : "bg-neutral-50 border-black/10 text-neutral-800 placeholder:text-neutral-400")}
                                                        placeholder="Please specify..."
                                                        onChange={(e) => setFriendReportReason(e.target.value)}
                                                    />
                                                )}
                                            </div>
                                            <DialogFooter className={cn("p-4 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                                <Button variant="ghost" onClick={() => setReportFriend(null)} className={cn("transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")}>Cancel</Button>
                                                <Button
                                                    className={cn("px-8 transition-all active:scale-95 shadow-lg", isDarkMode ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/10" : "bg-red-500 text-white hover:bg-red-600")}
                                                    disabled={!friendReportReason}
                                                    onClick={submitFriendReport}
                                                >
                                                    Submit Report
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Group Settings Dialog */}
                                    <Dialog open={isGroupSettingsOpen} onOpenChange={setIsGroupSettingsOpen}>
                                        <DialogContent className={cn("border sm:max-w-md p-0 overflow-hidden shadow-2xl transition-colors", isDarkMode ? "bg-canvas border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader className={cn("p-6 pb-2 border-b transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                <DialogTitle className={cn("text-xl font-bold transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Group Settings</DialogTitle>
                                                <DialogDescription className={cn("text-xs transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                                    Manage group security and participant permissions.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="p-6 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className={cn("font-bold text-sm transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>Edit group info</p>
                                                        <p className={cn("text-xs transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>Only admins can edit this group's name and description.</p>
                                                    </div>
                                                    <Checkbox
                                                        checked={selectedFriend.groupSettings?.onlyAdminsCanEditInfo || false}
                                                        onCheckedChange={() => handleToggleGroupPermission(selectedFriend.id, 'onlyAdminsCanEditInfo')}
                                                        className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-black"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className={cn("font-bold text-sm transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>Add members</p>
                                                        <p className={cn("text-xs transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>Only admins can add new participants to this group.</p>
                                                    </div>
                                                    <Checkbox
                                                        checked={selectedFriend.groupSettings?.onlyAdminsCanAddMembers || false}
                                                        onCheckedChange={() => handleToggleGroupPermission(selectedFriend.id, 'onlyAdminsCanAddMembers')}
                                                        className={cn("transition-colors", isDarkMode ? "border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-black" : "border-black/20 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white")}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className={cn("font-bold text-sm transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>Send messages</p>
                                                        <p className={cn("text-xs transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>Only admins can send messages to this group.</p>
                                                    </div>
                                                    <Checkbox
                                                        checked={selectedFriend.groupSettings?.onlyAdminsCanSendMessages || false}
                                                        onCheckedChange={() => handleToggleGroupPermission(selectedFriend.id, 'onlyAdminsCanSendMessages')}
                                                        className={cn("transition-colors", isDarkMode ? "border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-black" : "border-black/20 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white")}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter className={cn("p-4 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                                <Button className={cn("px-8 transition-all active:scale-95 shadow-lg", isDarkMode ? "bg-accent text-canvas hover:bg-accent/90" : "bg-sky-500 text-white hover:bg-sky-600")} onClick={() => setIsGroupSettingsOpen(false)}>Done</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Add Blocked Contact Modal */}
                                    <Dialog open={isAddingBlockedContact} onOpenChange={setIsAddingBlockedContact}>
                                        <DialogContent className={cn("border max-w-sm rounded-2xl p-6 shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                                            <DialogHeader>
                                                <DialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Block a Contact</DialogTitle>
                                            </DialogHeader>
                                            <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar py-4">
                                                {friendsList.filter(f => !f.isBlocked && !f.isGroup && !f.isExited).length === 0 ? (
                                                    <p className={cn("text-center text-sm transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>No contacts available to block.</p>
                                                ) : (
                                                    friendsList.filter(f => !f.isBlocked && !f.isGroup && !f.isExited).map(friend => (
                                                        <div
                                                            key={friend.id}
                                                            className={cn("flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all", isDarkMode ? "hover:bg-white/5" : "hover:bg-neutral-50")}
                                                            onClick={() => {
                                                                setBlockConfirm(friend)
                                                                setIsAddingBlockedContact(false)
                                                            }}
                                                        >
                                                            <Avatar className={cn("w-10 h-10 border transition-colors", isDarkMode ? "border-line" : "border-black/5")}>
                                                                <AvatarImage src={friend.image} />
                                                                <AvatarFallback className={cn("transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-100")}>{friend.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className={cn("font-medium truncate transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{friend.name}</p>
                                                                <p className={cn("text-xs truncate transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{friend.email}</p>
                                                            </div>
                                                            <Ban className={cn("w-4 h-4 transition-colors", isDarkMode ? "text-white/40" : "text-neutral-400")} />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </>
                            ) : globalSearchResult === "not_found" ? (
                                <div className="flex-grow flex flex-col items-center justify-center text-center p-10 animate-in zoom-in-95 duration-500">
                                    <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mb-6", isDarkMode ? "bg-red-500/10" : "bg-red-50")}>
                                        <UserX className={cn("w-12 h-12", isDarkMode ? "text-red-400" : "text-red-500")} />
                                    </div>
                                    <h2 className={cn("text-2xl font-bold mb-2", isDarkMode ? "text-white" : "text-neutral-900")}>User Not Found</h2>
                                    <p className={cn("max-w-sm mb-8 animate-in slide-in-from-bottom-2", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                        We couldn't find any account associated with that email address. Please make sure the email is correct.
                                    </p>
                                    <Button
                                        variant="outline"
                                        className={cn("h-12 px-8 rounded-xl transition-all active:scale-95", isDarkMode ? "border-line text-white hover:bg-white/5" : "border-black/10 text-neutral-800 hover:bg-neutral-100")}
                                        onClick={() => {
                                            setGlobalSearchResult(null);
                                            setAddEmail("");
                                        }}
                                    >
                                        Try Another Email
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-700">
                                    <div className={cn("w-32 h-32 rounded-full flex items-center justify-center mb-8 relative group transition-colors", isDarkMode ? "bg-primary/10" : "bg-primary/10")}>
                                        <div className={cn("absolute inset-0 rounded-full blur-2xl animate-pulse transition-all opacity-50", isDarkMode ? "bg-accent/40 group-hover:bg-accent/60" : "bg-accent/20 group-hover:bg-accent/30")} />
                                        <div className={cn("absolute -top-2 -right-2 w-10 h-10 border rounded-2xl flex items-center justify-center shadow-2xl animate-bounce transition-colors", isDarkMode ? "bg-panel-2 border-line" : "bg-white border-black/5")}>
                                            <MessageSquare className="w-5 h-5 text-accent" />
                                        </div>
                                        <div className={cn("absolute -bottom-2 -left-2 w-10 h-10 border rounded-2xl flex items-center justify-center shadow-2xl animate-bounce transition-colors", isDarkMode ? "bg-panel-2 border-line" : "bg-white border-black/5")} style={{ animationDelay: '0.5s' }}>
                                            <Users className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <Users className={cn("w-14 h-14 relative z-10 transition-colors", isDarkMode ? "text-white" : "text-neutral-800")} />
                                    </div>
                                    <h2 className={cn("text-3xl font-bold mb-3 tracking-tight transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Connect with Ease</h2>
                                    <p className={cn("max-w-sm leading-relaxed text-sm transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>
                                        Your professional AI workspace is ready. Add friends to start sharing transcriptions, recordings, and ideas in real-time.
                                    </p>

                                    {!isAddingFriend && (
                                        <Button
                                            className="mt-10 bg-accent text-canvas hover:bg-accent/90 border-none px-10 h-14 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] glow"
                                            onClick={toggleAddFriendMode}
                                        >
                                            <UserPlus className="w-5 h-5 mr-2" />
                                            Add Your First Friend
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Hide footer on this page for full height chat feel */}

                <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          .glow-hover:hover {
            box-shadow: 0 0 15px rgba(var(--brand-rgb), 0.4);
            background: rgba(var(--brand-rgb), 0.1);
          }
        `}</style>
            </div >
            {/* Group Creation Modal */}
            <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
                <DialogContent className={cn("border max-w-sm rounded-2xl p-6 shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                    <DialogHeader>
                        <DialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Create New Group</DialogTitle>
                    </DialogHeader>

                    {groupStep === 1 ? (
                        <div className="space-y-4 py-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <Avatar className={cn("w-24 h-24 border-2 transition-colors", isDarkMode ? "border-sky-500/20" : "border-sky-500/10")}>
                                        {newGroupImage ? (
                                            <AvatarImage src={newGroupImage} className="object-cover" />
                                        ) : (
                                            <AvatarFallback className={cn("transition-colors", isDarkMode ? "bg-white/5 text-white/20" : "bg-neutral-100 text-neutral-300")}>
                                                <Users className="w-10 h-10" />
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-white hover:text-sky-400 rounded-full"
                                            onClick={() => openCamera('group_creation')}
                                        >
                                            <Camera className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-white hover:text-sky-400 rounded-full"
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e: any) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const url = URL.createObjectURL(file);
                                                        setNewGroupImage(url);
                                                    }
                                                };
                                                input.click();
                                            }}
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className={cn("text-[10px] uppercase tracking-widest font-bold transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>Group Icon</p>
                            </div>
                            <div className="space-y-2">
                                <label className={cn("text-xs font-bold uppercase tracking-wider px-1 transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>Group Name</label>
                                <Input
                                    placeholder="Enter group name..."
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className={cn("h-11 rounded-xl transition-colors", isDarkMode ? "bg-white/5 border-line text-white placeholder:text-white/20 focus:border-accent" : "bg-neutral-50 border-black/5 text-neutral-800 placeholder:text-neutral-400 focus:border-accent")}
                                />
                            </div>
                            <Button
                                className="w-full bg-accent text-canvas hover:bg-accent/90 glow"
                                onClick={() => {
                                    if (newGroupName.trim()) setGroupStep(2)
                                    else toast({ title: "Error", description: "Name is required", variant: "destructive" })
                                }}
                            >
                                Next
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar">
                                {friendsList.filter(f => !f.isGroup && !f.isArchived).map(friend => (
                                    <div
                                        key={friend.id}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                            selectedGroupMembers.includes(friend.id)
                                                ? (isDarkMode ? "bg-accent/20 border-accent/50" : "bg-accent/10 border-accent/30")
                                                : (isDarkMode ? "bg-white/5 border-transparent hover:bg-white/10" : "bg-neutral-50 border-transparent hover:bg-neutral-100")
                                        )}
                                        onClick={() => {
                                            setSelectedGroupMembers(prev =>
                                                prev.includes(friend.id)
                                                    ? prev.filter(id => id !== friend.id)
                                                    : [...prev, friend.id]
                                            )
                                        }}
                                    >
                                        <Checkbox
                                            checked={selectedGroupMembers.includes(friend.id)}
                                            className={cn("transition-colors", isDarkMode ? "border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-black" : "border-black/20 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white")}
                                        />
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={friend.image} />
                                            <AvatarFallback className={cn(isDarkMode ? "bg-white/5 text-white/40" : "bg-neutral-100 text-neutral-500")}>{friend.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <p className={cn("font-medium truncate transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>{friend.name}</p>
                                            <p className={cn("text-xs truncate transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>{friend.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" className={cn("flex-1 transition-colors", isDarkMode ? "text-white/60 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100")} onClick={() => setGroupStep(1)}>Back</Button>
                                <Button
                                    className="flex-1 bg-accent text-canvas hover:bg-accent/90 shadow-lg shadow-accent/20"
                                    onClick={handleCreateGroup}
                                >
                                    Create ({selectedGroupMembers.length})
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Modal for Chats */}
            <AlertDialog open={showBulkChatDeleteModal} onOpenChange={setShowBulkChatDeleteModal}>
                <AlertDialogContent className={cn("border rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Delete {selectedChatIds.length} chats?</AlertDialogTitle>
                        <AlertDialogDescription className={cn("transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>
                            This action cannot be undone. All messages in these chats will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={cn("border-none transition-all", isDarkMode ? "bg-transparent text-white/60 hover:text-white hover:bg-white/10" : "bg-neutral-100 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20"
                            onClick={() => {
                                setFriendsList(prev => prev.filter(f => !selectedChatIds.includes(f.id)))
                                toast({ title: "Deleted", description: `${selectedChatIds.length} chats deleted.` })
                                setIsMultiSelectMode(false)
                                setSelectedChatIds([])
                                setShowBulkChatDeleteModal(false)
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Settings Modal */}
            <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
                <DialogContent className={cn("border max-w-md rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                    <DialogHeader>
                        <DialogTitle className={cn("flex items-center gap-2 transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>
                            <Settings className="w-5 h-5 text-accent" />
                            Settings
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <h3 className={cn("font-bold text-sm uppercase tracking-widest transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>About</h3>
                            <div className={cn("p-4 rounded-xl space-y-2 transition-colors", isDarkMode ? "bg-white/5" : "bg-neutral-50")}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", isDarkMode ? "bg-accent/10" : "bg-accent/5")}>
                                        <Info className="w-5 h-5 text-accent" />
                                    </div>
                                    <div>
                                        <h4 className={cn("font-bold transition-colors", isDarkMode ? "text-white" : "text-neutral-800")}>OmniMeetX Web</h4>
                                        <p className={cn("text-xs transition-colors", isDarkMode ? "text-white/40" : "text-neutral-500")}>Version 2.0.0 (Beta)</p>
                                    </div>
                                </div>
                                <p className={cn("text-sm leading-relaxed pt-2 border-t mt-2 transition-colors", isDarkMode ? "text-white/60 border-line" : "text-neutral-600 border-black/5")}>
                                    Professional AI-powered messaging platform.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className={cn("font-bold text-sm uppercase tracking-widest transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>Account</h3>
                            <Button variant="ghost" className={cn("w-full justify-start text-red-400 hover:text-red-300 transition-colors", isDarkMode ? "hover:bg-red-500/10" : "hover:bg-red-50")}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Block Confirmation Modal */}
            <AlertDialog open={!!blockConfirm} onOpenChange={(open) => !open && setBlockConfirm(null)}>
                <AlertDialogContent className={cn("border rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Block {blockConfirm?.name}?</AlertDialogTitle>
                        <AlertDialogDescription className={cn("transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>
                            Blocked contacts will no longer be able to call you or send you messages. This contact will not be notified.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={cn("border-none transition-all", isDarkMode ? "bg-white/5 text-white/60 hover:text-white hover:bg-white/10" : "bg-neutral-100 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (blockConfirm) {
                                    setFriendsList(prev => prev.map(f => f.id === blockConfirm.id ? { ...f, isBlocked: true } : f))
                                    toast({ title: "Blocked", description: `${blockConfirm.name} has been blocked.` })
                                    setBlockConfirm(null)
                                    if (selectedFriendId === blockConfirm.id) {
                                        setSelectedFriendId(null)
                                    }
                                }
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20"
                        >
                            Block
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Friend Delete Confirmation Modal */}
            <AlertDialog open={!!friendDeleteConfirm} onOpenChange={(open) => !open && setFriendDeleteConfirm(null)}>
                <AlertDialogContent className={cn("border rounded-2xl shadow-2xl transition-colors", isDarkMode ? "bg-panel-2 border-line text-white" : "bg-white border-black/5 text-neutral-800")}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className={cn("transition-colors", isDarkMode ? "text-white" : "text-neutral-900")}>Delete chat with {friendDeleteConfirm?.name}?</AlertDialogTitle>
                        <AlertDialogDescription className={cn("transition-colors", isDarkMode ? "text-white/60" : "text-neutral-500")}>
                            This will permanently delete the chat history with this contact. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={cn("border-none transition-all", isDarkMode ? "bg-white/5 text-white/60 hover:text-white hover:bg-white/10" : "bg-neutral-100 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteChatConfirmed} className="bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20">
                            Delete Chat
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthGuard>
    )
}
