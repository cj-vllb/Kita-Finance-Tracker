// The ONE icon system for categories and budgets. Every icon is a lucide-react icon (already a dependency) stored by a stable id (a lowercase
// kebab-case name such as 'shopping-cart') in categories.icon / budgets.icon. Pickers, lists, transaction rows and reports all read icons from here,
// so a category looks the same everywhere. An id that is missing or not in this list falls back to FALLBACK_ICON; nothing ever throws.
import {
  Wallet, Banknote, CreditCard, Coins, PiggyBank, Landmark, Receipt, Percent, TrendingUp, TrendingDown, Calculator, DollarSign,
  Briefcase, Building2, Laptop, FileText, Mail, Megaphone, Award, Trophy, Medal, Crown, Target, Rocket,
  ShoppingCart, ShoppingBag, Store, Tag, Tags, Shirt, Gem, Package, Ticket, Scissors, Glasses,
  Utensils, Coffee, Pizza, Apple, Cake, Beer, Wine, Soup, Cookie, Carrot, Beef, Milk,
  Car, Bus, Bike, Plane, Ship, Fuel, Truck,
  Home, Sofa, Bed, Bath, Lamp, Key, Hammer, Wrench, Paintbrush, Trash2,
  Heart, HeartPulse, Stethoscope, Pill, Syringe, Activity, Dumbbell, Brain, Eye, Smile, Thermometer,
  GraduationCap, BookOpen, Library, Pencil, Smartphone, Monitor, Tv, Wifi, Headphones, Camera, Cpu, Gamepad2, Printer,
  Film, Music, Clapperboard, Palette, Dices, Puzzle, PartyPopper, Sparkles, Star, Popcorn,
  Luggage, MapPin, Map as MapIcon, Globe, Tent, Mountain, Umbrella, Compass, Sun, Waves,
  Users, User, Baby, PawPrint, Dog, Cat, Bird, Fish,
  Gift, HeartHandshake,
  Zap, Lightbulb, Droplet, Flame, Phone, Plug, Fan, Recycle, Leaf, Cloud, Wind,
  Shield, ShieldCheck, Lock, Bell, Clock, Calendar, Repeat, RefreshCw, Bookmark, Flag, Folder, Archive, Box, Layers, HelpCircle, Scale, Gavel, Hourglass, ArrowLeftRight,
} from 'lucide-react'

// [id, label, component, group]
const LIST = [
  ['wallet', 'Wallet', Wallet, 'Money'], ['banknote', 'Cash', Banknote, 'Money'], ['credit-card', 'Credit card', CreditCard, 'Money'], ['coins', 'Coins', Coins, 'Money'],
  ['piggy-bank', 'Piggy bank', PiggyBank, 'Money'], ['landmark', 'Bank', Landmark, 'Money'], ['receipt', 'Receipt', Receipt, 'Money'], ['percent', 'Percent', Percent, 'Money'],
  ['trending-up', 'Growth', TrendingUp, 'Money'], ['trending-down', 'Decline', TrendingDown, 'Money'], ['calculator', 'Calculator', Calculator, 'Money'], ['dollar-sign', 'Dollar sign', DollarSign, 'Money'],
  ['briefcase', 'Briefcase', Briefcase, 'Work'], ['building-2', 'Office building', Building2, 'Work'], ['laptop', 'Laptop', Laptop, 'Work'], ['file-text', 'Document', FileText, 'Work'],
  ['mail', 'Mail', Mail, 'Work'], ['megaphone', 'Megaphone', Megaphone, 'Work'], ['award', 'Award', Award, 'Work'], ['trophy', 'Trophy', Trophy, 'Work'],
  ['medal', 'Medal', Medal, 'Work'], ['crown', 'Crown', Crown, 'Work'], ['target', 'Target', Target, 'Work'], ['rocket', 'Rocket', Rocket, 'Work'],
  ['shopping-cart', 'Shopping cart', ShoppingCart, 'Shopping'], ['shopping-bag', 'Shopping bag', ShoppingBag, 'Shopping'], ['store', 'Store', Store, 'Shopping'], ['tag', 'Tag', Tag, 'Shopping'],
  ['tags', 'Tags', Tags, 'Shopping'], ['shirt', 'Clothing', Shirt, 'Shopping'], ['gem', 'Jewelry', Gem, 'Shopping'], ['package', 'Package', Package, 'Shopping'],
  ['ticket', 'Ticket', Ticket, 'Shopping'], ['scissors', 'Scissors', Scissors, 'Shopping'], ['glasses', 'Glasses', Glasses, 'Shopping'],
  ['utensils', 'Dining', Utensils, 'Food'], ['coffee', 'Coffee', Coffee, 'Food'], ['pizza', 'Pizza', Pizza, 'Food'], ['apple', 'Fruit', Apple, 'Food'],
  ['cake', 'Cake', Cake, 'Food'], ['beer', 'Beer', Beer, 'Food'], ['wine', 'Wine', Wine, 'Food'], ['soup', 'Soup', Soup, 'Food'],
  ['cookie', 'Snacks', Cookie, 'Food'], ['carrot', 'Vegetables', Carrot, 'Food'], ['beef', 'Meat', Beef, 'Food'], ['milk', 'Milk', Milk, 'Food'],
  ['car', 'Car', Car, 'Transport'], ['bus', 'Bus', Bus, 'Transport'], ['bike', 'Bicycle', Bike, 'Transport'], ['plane', 'Plane', Plane, 'Transport'],
  ['ship', 'Ship', Ship, 'Transport'], ['fuel', 'Fuel', Fuel, 'Transport'], ['truck', 'Truck', Truck, 'Transport'],
  ['home', 'Home', Home, 'Home'], ['sofa', 'Sofa', Sofa, 'Home'], ['bed', 'Bed', Bed, 'Home'], ['bath', 'Bath', Bath, 'Home'],
  ['lamp', 'Lamp', Lamp, 'Home'], ['key', 'Key', Key, 'Home'], ['hammer', 'Hammer', Hammer, 'Home'], ['wrench', 'Repairs', Wrench, 'Home'],
  ['paintbrush', 'Paintbrush', Paintbrush, 'Home'], ['trash-2', 'Trash', Trash2, 'Home'],
  ['heart', 'Heart', Heart, 'Health'], ['heart-pulse', 'Heart rate', HeartPulse, 'Health'], ['stethoscope', 'Doctor', Stethoscope, 'Health'], ['pill', 'Medicine', Pill, 'Health'],
  ['syringe', 'Vaccine', Syringe, 'Health'], ['activity', 'Activity', Activity, 'Health'], ['dumbbell', 'Fitness', Dumbbell, 'Health'], ['brain', 'Mind', Brain, 'Health'],
  ['eye', 'Eye care', Eye, 'Health'], ['smile', 'Smile', Smile, 'Health'], ['thermometer', 'Thermometer', Thermometer, 'Health'],
  ['graduation-cap', 'Graduation', GraduationCap, 'Education & tech'], ['book-open', 'Book', BookOpen, 'Education & tech'], ['library', 'Library', Library, 'Education & tech'], ['pencil', 'Pencil', Pencil, 'Education & tech'],
  ['smartphone', 'Phone', Smartphone, 'Education & tech'], ['monitor', 'Computer', Monitor, 'Education & tech'], ['tv', 'Television', Tv, 'Education & tech'], ['wifi', 'Internet', Wifi, 'Education & tech'],
  ['headphones', 'Headphones', Headphones, 'Education & tech'], ['camera', 'Camera', Camera, 'Education & tech'], ['cpu', 'Chip', Cpu, 'Education & tech'], ['gamepad-2', 'Games', Gamepad2, 'Education & tech'],
  ['printer', 'Printer', Printer, 'Education & tech'],
  ['film', 'Movies', Film, 'Entertainment'], ['music', 'Music', Music, 'Entertainment'], ['clapperboard', 'Clapperboard', Clapperboard, 'Entertainment'], ['palette', 'Art', Palette, 'Entertainment'],
  ['dices', 'Dice', Dices, 'Entertainment'], ['puzzle', 'Puzzle', Puzzle, 'Entertainment'], ['party-popper', 'Party', PartyPopper, 'Entertainment'], ['sparkles', 'Sparkles', Sparkles, 'Entertainment'],
  ['star', 'Star', Star, 'Entertainment'], ['popcorn', 'Popcorn', Popcorn, 'Entertainment'],
  ['luggage', 'Luggage', Luggage, 'Travel'], ['map-pin', 'Location', MapPin, 'Travel'], ['map', 'Map', MapIcon, 'Travel'], ['globe', 'Globe', Globe, 'Travel'],
  ['tent', 'Camping', Tent, 'Travel'], ['mountain', 'Mountain', Mountain, 'Travel'], ['umbrella', 'Umbrella', Umbrella, 'Travel'], ['compass', 'Compass', Compass, 'Travel'],
  ['sun', 'Sun', Sun, 'Travel'], ['waves', 'Beach', Waves, 'Travel'],
  ['users', 'Family', Users, 'People & pets'], ['user', 'Person', User, 'People & pets'], ['baby', 'Baby', Baby, 'People & pets'], ['paw-print', 'Paw print', PawPrint, 'People & pets'],
  ['dog', 'Dog', Dog, 'People & pets'], ['cat', 'Cat', Cat, 'People & pets'], ['bird', 'Bird', Bird, 'People & pets'], ['fish', 'Fish', Fish, 'People & pets'],
  ['gift', 'Gift', Gift, 'Gifts'], ['heart-handshake', 'Charity', HeartHandshake, 'Gifts'],
  ['zap', 'Electricity', Zap, 'Utilities'], ['lightbulb', 'Light bulb', Lightbulb, 'Utilities'], ['droplet', 'Water', Droplet, 'Utilities'], ['flame', 'Gas', Flame, 'Utilities'],
  ['phone', 'Telephone', Phone, 'Utilities'], ['plug', 'Plug', Plug, 'Utilities'], ['fan', 'Fan', Fan, 'Utilities'], ['recycle', 'Recycling', Recycle, 'Utilities'],
  ['leaf', 'Leaf', Leaf, 'Utilities'], ['cloud', 'Cloud', Cloud, 'Utilities'], ['wind', 'Wind', Wind, 'Utilities'],
  ['shield', 'Shield', Shield, 'General'], ['shield-check', 'Insurance', ShieldCheck, 'General'], ['lock', 'Lock', Lock, 'General'], ['bell', 'Bell', Bell, 'General'],
  ['clock', 'Clock', Clock, 'General'], ['calendar', 'Calendar', Calendar, 'General'], ['repeat', 'Recurring', Repeat, 'General'], ['refresh-cw', 'Refresh', RefreshCw, 'General'],
  ['bookmark', 'Bookmark', Bookmark, 'General'], ['flag', 'Flag', Flag, 'General'], ['folder', 'Folder', Folder, 'General'], ['archive', 'Archive', Archive, 'General'],
  ['box', 'Box', Box, 'General'], ['layers', 'Layers', Layers, 'General'], ['help-circle', 'Question', HelpCircle, 'General'], ['scale', 'Scale', Scale, 'General'],
  ['gavel', 'Legal', Gavel, 'General'], ['hourglass', 'Hourglass', Hourglass, 'General'], ['arrow-left-right', 'Exchange', ArrowLeftRight, 'General'],
]

export const FALLBACK_ICON = 'tag'
export const ICONS = LIST.map(([id, label, , group]) => ({ id, label, group }))
export const ICON_GROUPS = [...new Set(LIST.map((x) => x[3]))].map((group) => ({ group, icons: ICONS.filter((i) => i.group === group) }))
const BY_ID = new Map(LIST.map(([id, , Component]) => [id, Component]))
export const isValidIconId = (id) => typeof id === 'string' && BY_ID.has(id)
export const iconLabel = (id) => ICONS.find((i) => i.id === id)?.label || 'Tag'
// Always returns a renderable component: the chosen icon, else the given fallback id, else the generic tag.
export const iconComponent = (id, fallback = FALLBACK_ICON) => BY_ID.get(id) || BY_ID.get(fallback) || BY_ID.get(FALLBACK_ICON)
