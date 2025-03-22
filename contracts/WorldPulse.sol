pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract WorldPulse is Initializable, ERC20Upgradeable {
    event PulseEvent(address sender, uint256 amount, uint256 pulseCount);

    function initialize() public initializer {
        __ERC20_init("WorldPulse", "WPU");
        _mint(msg.sender, 1000000 * 10**18); // 1M WPU, 18 decimals
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        bool success = super.transfer(to, amount);
        emit PulseEvent(msg.sender, amount, block.number); // Future hook
        return success;
    }
}