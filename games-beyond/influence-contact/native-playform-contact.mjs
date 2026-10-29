/* Original sovereign JM PLAYFORM is invoked, not rewritten here.
 * Real native donor: coding-estate/sovereign-batch-six/direct/game-input-native-b.mjs
 * This contact is editorial research state, NEVER playable simulation state.
 */
import { PLAYFORM } from '../../coding-estate/sovereign-batch-six/direct/game-input-native-b.mjs';
import {comparePrivateEvidence} from './influence-core.mjs';

const PROGRAM=`playform GameInfluenceContact {
  form: JM_Game_Influence_Contact
  regions: [evidence, comparison]
  interactions: [inspect, compare]
  layout: source_side_reference_only
  state_path: research.influenceContact
}`;
export function executeNativeEvidenceContact(register,title,priorResearchState={}){
  const comparison=comparePrivateEvidence(register,title);
  const input={region:comparison.relationship?'comparison':'evidence',
    type:comparison.relationship?'compare':'inspect',value:comparison};
  const output=PLAYFORM.execute(PROGRAM,input,priorResearchState);
  return {
    schema:'jm.gaming-influence-native-playform-contact/0.1',
    comparison,
    state:output.state,
    nativeReceipt:output.receipt,
    nativeTrace:output.trace,
    nativeEngine:'JM PLAYFORM sovereign source',
    proof:'HOST_NATIVE_PLAYFORM_RESEARCH_CONTACT_ONLY',
    gameRuntimeInvoked:false,
    rendererInvoked:false,
    gardlesInvoked:false
  };
}
