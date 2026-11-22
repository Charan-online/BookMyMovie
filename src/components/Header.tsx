import { useState } from 'react';
import { Menu, User, X } from 'lucide-react';
import type { UserProfile } from '../services/cinemaService';

export type AppRoute = 'home' | 'showtimes' | 'seat-3d' | 'checkout' | 'confirmation';

interface HeaderProps {
  activeRoute: AppRoute;
  onNavigateHome: () => void;
  onJumpToSection: (sectionId: string) => void;
  onLaunchQuick3D: () => void;
  onOpenAccount: (tab?: 'profile' | 'favorites' | 'history') => void;
  userProfile: UserProfile | null;
  authLoading: boolean;
}

export function Header({
  activeRoute,
  onNavigateHome,
  onJumpToSection,
  onLaunchQuick3D,
  onOpenAccount,
  userProfile,
  authLoading,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLink = (fn: () => void) => {
    setMobileMenuOpen(false);
    fn();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A0B0E]/95 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleLink(onNavigateHome)}
          className="font-display text-xl md:text-2xl font-semibold tracking-tight text-[#F4F2EE] hover:text-[#E5A93B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93B]"
        >
          Lumière
        </button>

        {/* Zone 2: 4 Single-Line Text Navigation Links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9CA3AF]"
        >
          <button
            type="button"
            onClick={() => handleLink(() => onJumpToSection('now-showing'))}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#F4F2EE] ${
              activeRoute === 'home' ? 'text-[#F4F2EE] border-b border-[#E5A93B]' : ''
            }`}
          >
            Now Showing
          </button>
          <button
            type="button"
            onClick={() => handleLink(onLaunchQuick3D)}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#F4F2EE] ${
              activeRoute === 'seat-3d' ? 'text-[#F4F2EE] border-b border-[#E5A93B]' : ''
            }`}
          >
            3D Seat Preview
          </button>
          <button
            type="button"
            onClick={() => handleLink(() => onJumpToSection('theaters'))}
            className="py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#F4F2EE]"
          >
            Theaters
          </button>
          <button
            type="button"
            onClick={() => handleLink(() => onOpenAccount('history'))}
            className="py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#F4F2EE]"
          >
            My Tickets
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleLink(() => onOpenAccount('profile'))}
            disabled={authLoading}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-xs md:text-sm font-semibold hover:bg-[#F0B84E] transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93B]"
          >
            <User className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[130px] truncate">
              {userProfile ? userProfile.displayName : 'Sign In'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-white/10 text-[#F4F2EE] hover:bg-white/5 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-white/10 bg-[#12141A] px-4 py-3 flex flex-col gap-1"
        >
          <button
            type="button"
            onClick={() => handleLink(() => onJumpToSection('now-showing'))}
            className="min-h-[44px] px-3 text-left text-sm font-medium text-[#F4F2EE] rounded-lg hover:bg-white/5"
          >
            Now Showing
          </button>
          <button
            type="button"
            onClick={() => handleLink(onLaunchQuick3D)}
            className="min-h-[44px] px-3 text-left text-sm font-medium text-[#F4F2EE] rounded-lg hover:bg-white/5"
          >
            3D Seat Preview
          </button>
          <button
            type="button"
            onClick={() => handleLink(() => onJumpToSection('theaters'))}
            className="min-h-[44px] px-3 text-left text-sm font-medium text-[#F4F2EE] rounded-lg hover:bg-white/5"
          >
            Theaters
          </button>
          <button
            type="button"
            onClick={() => handleLink(() => onOpenAccount('history'))}
            className="min-h-[44px] px-3 text-left text-sm font-medium text-[#F4F2EE] rounded-lg hover:bg-white/5"
          >
            My Tickets & Favorites
          </button>
        </nav>
      )}
    </header>
  );
}
