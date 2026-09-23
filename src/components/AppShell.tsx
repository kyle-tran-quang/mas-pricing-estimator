import type { MouseEvent } from 'react';
import {
  Header,
  HeaderContainer,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from '@carbon/react';
import { ShowDataCards, AiLaunch, UserAvatarFilledAlt, Switcher } from '@carbon/icons-react';

interface AppShellProps {
  onAiLaunch: () => void;
}

export default function AppShell({ onAiLaunch }: AppShellProps) {
  return (
    <HeaderContainer
      render={({ isSideNavExpanded, onClickSideNavExpand }) => (
        <Header aria-label="IBM Sales Configurator">
          <SkipToContent />
          <HeaderMenuButton
            aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
            onClick={onClickSideNavExpand}
            isActive={isSideNavExpanded}
            aria-expanded={isSideNavExpanded}
          />
          <HeaderName href="#" prefix="IBM">
            Sales Configurator
          </HeaderName>
          <HeaderGlobalBar>
            <HeaderGlobalAction aria-label="AI assistant" tooltipAlignment="center" onClick={onAiLaunch}>
              <AiLaunch size={20} />
            </HeaderGlobalAction>
            <HeaderGlobalAction aria-label="User profile" tooltipAlignment="center">
              <UserAvatarFilledAlt size={20} />
            </HeaderGlobalAction>
            <HeaderGlobalAction aria-label="Maximo product switcher" tooltipAlignment="end">
              <Switcher size={20} />
            </HeaderGlobalAction>
          </HeaderGlobalBar>
          <SideNav
            aria-label="Actions"
            expanded={isSideNavExpanded}
            onSideNavBlur={onClickSideNavExpand}
            isPersistent={false}
          >
            <SideNavItems>
              <SideNavLink renderIcon={ShowDataCards} href="#">
                Data cards
              </SideNavLink>
              <SideNavLink
                renderIcon={AiLaunch}
                href="#"
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  onAiLaunch();
                }}
              >
                AI assistant
              </SideNavLink>
              <SideNavLink renderIcon={UserAvatarFilledAlt} href="#">
                User profile
              </SideNavLink>
              <SideNavLink renderIcon={Switcher} href="#">
                Product switcher
              </SideNavLink>
            </SideNavItems>
          </SideNav>
        </Header>
      )}
    />
  );
}
