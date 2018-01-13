import {h as $, Component} from 'preact';
import {DOM} from 'preact-compat';
import {connect} from 'mobx-preact';
import {className} from './activity-monitor.styl';
import {headerBlock} from './helpers.styl';

class ActivityMonitor extends Component {
  render({activity}) {
    const activitiesList = activity.reverse().map(({msg, time}) => {
      return DOM.div({className: `${className}-item`},
        DOM.span({className: `${className}-item-time`}, time.toLocaleTimeString()),
        DOM.span({className: `${className}-item-text`}, msg),
      );
    });

    return DOM.div({className},
      DOM.div({className: headerBlock},
        DOM.div({className: `${headerBlock}-title`}, 'Activity')
      ),
      DOM.div({className: `${className}-list`},
        ...activitiesList
      )
    );
  }
}

export default connect(['activity'], ActivityMonitor);
