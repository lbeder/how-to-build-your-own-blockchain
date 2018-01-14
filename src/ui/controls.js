import {h as $, Component} from 'preact';
import {DOM} from 'preact-compat';
import {connect} from 'mobx-preact';
import RaisedButton from 'material-ui/RaisedButton';
import {indigo500, fullWhite} from 'material-ui/styles/colors';
import Toggle from 'material-ui/Toggle';
import {className} from './controls.styl';
import {headerBlock} from './helpers.styl';

const PeersCount = connect(['liveState'], class PeersCount {
  render({liveState: {peers}}) {
    return DOM.span(null, peers);
  }
});

class Controls extends Component {
  render({actions}) {
    return DOM.div({className: className},
      DOM.div({className: headerBlock},
        DOM.div({className: `${headerBlock}-title`}, 'Controls')
      ),
      DOM.div({className: `${className}-peers`},
        DOM.span({className: `${className}-peers-text`}, 'Connected Peers'),
        $(PeersCount)
      ),
      DOM.div({className: `${className}-boxes`},
        DOM.div({className: `${className}-box`},
          $(Toggle, {
            label: 'Auto Mining',
            toggled: actions.autoMining,
            onToggle: () => {
              actions.sendAction({type: 'config', args: {autoMining: !actions.autoMining}});
            }
          }),
          $(RaisedButton, {
            className: `${className}-button`,
            disabled: actions.autoMining,
            backgroundColor: indigo500,
            buttonStyle: {
              color: fullWhite
            },
            onClick: () => {
              if (actions.autoMining) return;
              actions.sendAction({type: 'mineOneBlock'});
            }
          }, 'Mine Block')
        ),
        DOM.div({className: `${className}-box`},
          $(Toggle, {
            label: 'Auto Consensus',
            toggled: actions.autoConsensus,
            onToggle: () => {
              actions.sendAction({type: 'config', args: {autoConsensus: !actions.autoConsensus}});
            }
          }),
          $(RaisedButton, {
            backgroundColor: indigo500,
            buttonStyle: {
              color: fullWhite
            },
            className: `${className}-button`,
            onClick: () => {
              if (actions.autoConsensus || actions.isConsensusRunning) return;
              actions.sendAction({type: 'consensus'});
            },
            disabled: actions.autoConsensus || actions.isConsensusRunning
          }, 'Consensus')
        )
      )
    );
  }
}

export default connect(['actions'], Controls);
